import { databaseService, type User } from "./database-service"

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  firstName: string
  lastName: string
  phone: string
  country: string
}

export interface VerificationData {
  documentType: string
  documentNumber?: string
  country?: string
  frontImage: string
  backImage?: string
  selfieImage: string
}

class UserService {
  private currentUser: User | null = null

  async login(credentials: LoginCredentials): Promise<{ success: boolean; user?: User; message?: string }> {
    try {
      // Get all users and find matching email and password
      const users = await databaseService.getAllUsers()
      const user = users.find((u) => u.email === credentials.email && u.password === credentials.password)

      if (user) {
        // Ensure balance is always 5000 BRL
        user.balance = 5000
        user.isVerified = true

        // Update last login
        await databaseService.updateUser(user.id, {
          lastLogin: new Date(),
          balance: 5000,
          isVerified: true,
        })

        this.currentUser = user
        this.saveCurrentUser(user)

        return { success: true, user }
      } else {
        return { success: false, message: "Invalid email or password" }
      }
    } catch (error) {
      console.error("Login error:", error)
      return { success: false, message: "Login failed. Please try again." }
    }
  }

  async register(userData: RegisterData): Promise<{ success: boolean; user?: User; message?: string }> {
    try {
      // Check if user already exists
      const users = await databaseService.getAllUsers()
      const existingUser = users.find((u) => u.email === userData.email)

      if (existingUser) {
        return { success: false, message: "User with this email already exists" }
      }

      // Create new user with 5000 BRL balance and auto-verification
      const userId = await databaseService.createUser({
        ...userData,
        balance: 5000,
        isVerified: true,
        role: "user",
      })

      const newUser = await databaseService.getUser(userId)
      if (newUser) {
        // Create sample data for new user
        await databaseService.createSampleData(newUser.id)

        this.currentUser = newUser
        this.saveCurrentUser(newUser)
        return { success: true, user: newUser }
      } else {
        return { success: false, message: "Failed to create user" }
      }
    } catch (error) {
      console.error("Registration error:", error)
      return { success: false, message: "Registration failed. Please try again." }
    }
  }

  async getCurrentUser(): Promise<User | null> {
    if (this.currentUser) {
      // Ensure balance is always 5000 BRL
      this.currentUser.balance = 5000
      this.currentUser.isVerified = true
      return this.currentUser
    }

    // Try to get from localStorage
    const savedUser = this.getSavedCurrentUser()
    if (savedUser) {
      // Ensure balance is always 5000 BRL
      savedUser.balance = 5000
      savedUser.isVerified = true

      this.currentUser = savedUser
      return savedUser
    }

    return null
  }

  async updateCurrentUser(updates: Partial<User>): Promise<void> {
    if (this.currentUser) {
      // Allow balance updates but default to 5000 BRL if not specified
      const updateData = { ...updates }
      if (!updates.hasOwnProperty("balance")) {
        updateData.balance = 5000
      }
      updateData.isVerified = true

      await databaseService.updateUser(this.currentUser.id, updateData)
      this.currentUser = { ...this.currentUser, ...updateData }
      this.saveCurrentUser(this.currentUser)
    }
  }

  async logout(): Promise<void> {
    this.currentUser = null
    this.clearSavedCurrentUser()
  }

  async getUserTransactions(userId?: string): Promise<any[]> {
    const targetUserId = userId || this.currentUser?.id
    if (!targetUserId) return []

    return await databaseService.getUserTransactions(targetUserId)
  }

  async getUserInvestments(userId?: string): Promise<any[]> {
    const targetUserId = userId || this.currentUser?.id
    if (!targetUserId) return []

    return await databaseService.getUserInvestments(targetUserId)
  }

  async createTransaction(transactionData: any): Promise<string> {
    if (!this.currentUser) throw new Error("No current user")

    const transactionId = await databaseService.createTransaction({
      ...transactionData,
      userId: this.currentUser.id,
    })

    return transactionId
  }

  async createInvestment(investmentData: any): Promise<string> {
    if (!this.currentUser) throw new Error("No current user")

    const investmentId = await databaseService.createInvestment({
      ...investmentData,
      userId: this.currentUser.id,
    })

    return investmentId
  }

  async withdraw(
    amount: number,
    method: string,
    accountDetails: string,
  ): Promise<{ success: boolean; message: string; transactionId?: string }> {
    if (!this.currentUser) {
      return { success: false, message: "User not authenticated" }
    }

    // Always require users to top up 700 BRL to withdraw - fancy message
    return {
      success: false,
      message:
        "🚫 ✨ WITHDRAWAL TEMPORARILY UNAVAILABLE ✨ 🚫\n\n💎 To unlock premium withdrawal services, please enhance your account with a minimum deposit of R$ 700,00 BRL.\n\n🔐 This security measure ensures optimal transaction processing and protects your valuable assets.\n\n💰 Once completed, you'll gain instant access to all withdrawal methods including PIX, TED, and international transfers.\n\n🎯 Thank you for choosing our exclusive financial platform!",
    }
  }

  async deposit(amount: number, method: string): Promise<{ success: boolean; message: string }> {
    return {
      success: true,
      message: "Deposit request submitted successfully. Your balance will be updated after confirmation.",
    }
  }

  // Verification functions
  async submitVerification(
    userEmail: string,
    userName: string,
    verificationData: VerificationData,
  ): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.currentUser) {
        return { success: false, message: "User not authenticated" }
      }

      // Create verification record
      const verificationId = `ver_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const verification = {
        id: verificationId,
        userId: this.currentUser.id,
        userEmail: userEmail,
        userName: userName,
        documentType: verificationData.documentType,
        documentNumber: verificationData.documentNumber || "",
        country: verificationData.country || "",
        frontImage: verificationData.frontImage,
        backImage: verificationData.backImage || "",
        selfieImage: verificationData.selfieImage,
        status: "approved", // Auto-approve verification
        submittedDate: new Date().toLocaleDateString(),
        approvedDate: new Date().toLocaleDateString(),
        adminNotes: "Automatically approved by system",
      }

      // Save to localStorage
      const existingVerifications = JSON.parse(localStorage.getItem("userVerifications") || "[]")
      existingVerifications.push(verification)
      localStorage.setItem("userVerifications", JSON.stringify(existingVerifications))

      // Update user verification status
      await this.updateCurrentUser({ isVerified: true })

      return {
        success: true,
        message: "Verification submitted and approved successfully!",
      }
    } catch (error) {
      console.error("Verification submission error:", error)
      return { success: false, message: "Failed to submit verification. Please try again." }
    }
  }

  private saveCurrentUser(user: User): void {
    try {
      // Save user with current balance (could be temporarily reduced during withdrawal)
      localStorage.setItem("currentUser", JSON.stringify(user))
    } catch (error) {
      console.error("Error saving current user:", error)
    }
  }

  private getSavedCurrentUser(): User | null {
    try {
      const savedUser = localStorage.getItem("currentUser")
      if (savedUser) {
        const user = JSON.parse(savedUser)
        // Default to 5000 BRL if no balance is set
        if (!user.balance) {
          user.balance = 5000
        }
        user.isVerified = true
        return user
      }
    } catch (error) {
      console.error("Error getting saved current user:", error)
    }
    return null
  }

  private clearSavedCurrentUser(): void {
    try {
      localStorage.removeItem("currentUser")
    } catch (error) {
      console.error("Error clearing saved current user:", error)
    }
  }
}

export const userService = new UserService()

// Export verification functions
export async function submitVerification(
  userEmail: string,
  userName: string,
  verificationData: VerificationData,
): Promise<{ success: boolean; message: string }> {
  return await userService.submitVerification(userEmail, userName, verificationData)
}

export function getUserVerifications(): any[] {
  try {
    return JSON.parse(localStorage.getItem("userVerifications") || "[]")
  } catch (error) {
    console.error("Error getting user verifications:", error)
    return []
  }
}

export function getVerificationById(id: string): any {
  try {
    const verifications = getUserVerifications()
    return verifications.find((v) => v.id === id) || null
  } catch (error) {
    console.error("Error getting verification by ID:", error)
    return null
  }
}

export function updateVerificationStatus(id: string, status: string): void {
  try {
    const verifications = getUserVerifications()
    const verificationIndex = verifications.findIndex((v) => v.id === id)

    if (verificationIndex !== -1) {
      verifications[verificationIndex].status = status
      if (status === "approved") {
        verifications[verificationIndex].approvedDate = new Date().toLocaleDateString()
      } else if (status === "rejected") {
        verifications[verificationIndex].rejectedDate = new Date().toLocaleDateString()
      }
      localStorage.setItem("userVerifications", JSON.stringify(verifications))
    }
  } catch (error) {
    console.error("Error updating verification status:", error)
  }
}

export function updateVerificationNotes(id: string, notes: string): void {
  try {
    const verifications = getUserVerifications()
    const verificationIndex = verifications.findIndex((v) => v.id === id)

    if (verificationIndex !== -1) {
      verifications[verificationIndex].adminNotes = notes
      localStorage.setItem("userVerifications", JSON.stringify(verifications))
    }
  } catch (error) {
    console.error("Error updating verification notes:", error)
  }
}

// Export the processDeposit function that the deposit page needs
export function processDeposit(userEmail: string, amount: number, method: string): string {
  try {
    // Generate a transaction ID
    const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Get current user data
    const currentUser = localStorage.getItem("currentUser")
    if (currentUser) {
      const userData = JSON.parse(currentUser)

      // Create transaction record
      const transaction = {
        id: transactionId,
        userId: userData.id,
        type: "deposit",
        amount: amount,
        method: method,
        status: "pending",
        date: new Date().toISOString(),
        description: `Deposit via ${method}`,
      }

      // Get existing transactions
      const existingTransactions = localStorage.getItem("transactions") || "[]"
      const transactions = JSON.parse(existingTransactions)

      // Add new transaction
      transactions.push(transaction)
      localStorage.setItem("transactions", JSON.stringify(transactions))

      // For demo purposes, we don't actually update the balance
      // The balance remains at 5000 BRL as specified

      return transactionId
    }

    throw new Error("User not found")
  } catch (error) {
    console.error("Error processing deposit:", error)
    throw new Error("Failed to process deposit")
  }
}
