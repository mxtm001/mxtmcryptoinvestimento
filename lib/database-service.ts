export interface User {
  id: string
  email: string
  password: string
  firstName: string
  lastName: string
  phone: string
  country: string
  balance: number
  isVerified: boolean
  isBlocked?: boolean
  role: "user" | "admin"
  createdAt: Date
  lastLogin: Date
}

export interface Transaction {
  id: string
  userId: string
  type: "deposit" | "withdrawal" | "investment" | "profit"
  amount: number
  currency: string
  method?: string
  accountDetails?: string
  status: "pending" | "completed" | "failed"
  description: string
  failureReason?: string
  createdAt: Date
  updatedAt: Date
}

export interface Investment {
  id: string
  userId: string
  planName: string
  amount: number
  duration: number
  expectedReturn: number
  status: "active" | "completed" | "cancelled"
  startDate: Date
  endDate: Date
  createdAt: Date
}

export interface VerificationDocument {
  id: string
  userId: string
  documentType: "passport" | "id_card" | "drivers_license" | "utility_bill"
  documentUrl: string
  status: "pending" | "approved" | "rejected"
  uploadedAt: Date
  reviewedAt?: Date
  reviewedBy?: string
  notes?: string
}

class DatabaseService {
  // User operations
  async createUser(userData: Omit<User, "id" | "createdAt" | "lastLogin">): Promise<string> {
    try {
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 9)
      const user: User = {
        ...userData,
        id,
        balance: 65000, // Always set balance to €65,000
        isVerified: true, // Auto-verify users
        isBlocked: false,
        createdAt: new Date(),
        lastLogin: new Date(),
      }

      this.saveToLocalStorage("users", user.id, user)
      return user.id
    } catch (error) {
      console.error("Error creating user:", error)
      throw error
    }
  }

  async getUser(userId: string): Promise<User | null> {
    try {
      const user = this.getFromLocalStorage("users", userId)
      if (user) {
        // Ensure balance is always €65,000 by default
        if (!user.balance) {
          user.balance = 65000
        }
        user.isVerified = true
        return user
      }
      return null
    } catch (error) {
      console.error("Error getting user:", error)
      return null
    }
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<void> {
    try {
      const existingUser = this.getFromLocalStorage("users", userId)
      if (existingUser) {
        // Allow balance updates but default to €65,000 if not specified
        const updateData = {
          ...updates,
          isVerified: true,
          updatedAt: new Date(),
        }

        if (!updates.hasOwnProperty("balance")) {
          updateData.balance = 65000
        }

        const updatedUser = { ...existingUser, ...updateData }
        this.saveToLocalStorage("users", userId, updatedUser)
      }
    } catch (error) {
      console.error("Error updating user:", error)
    }
  }

  async getAllUsers(): Promise<User[]> {
    try {
      const usersData = JSON.parse(localStorage.getItem("users") || "{}")
      const users = Object.values(usersData).map((user: any) => ({
        ...user,
        balance: user.balance || 65000, // Ensure balance defaults to €65,000
        isVerified: true,
        createdAt: new Date(user.createdAt),
        lastLogin: new Date(user.lastLogin),
      }))
      return users
    } catch (error) {
      console.error("Error getting users:", error)
      return []
    }
  }

  // Transaction operations
  async createTransaction(transactionData: Omit<Transaction, "id" | "createdAt" | "updatedAt">): Promise<string> {
    try {
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 9)
      const transaction: Transaction = {
        ...transactionData,
        id,
        currency: "EUR",
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      this.saveToLocalStorage("transactions", transaction.id, transaction)
      return transaction.id
    } catch (error) {
      console.error("Error creating transaction:", error)
      throw error
    }
  }

  async updateTransaction(transactionId: string, updates: Partial<Transaction>): Promise<void> {
    try {
      const existingTransaction = this.getFromLocalStorage("transactions", transactionId)
      if (existingTransaction) {
        const updatedTransaction = {
          ...existingTransaction,
          ...updates,
          updatedAt: new Date(),
        }
        this.saveToLocalStorage("transactions", transactionId, updatedTransaction)
      }
    } catch (error) {
      console.error("Error updating transaction:", error)
    }
  }

  async getUserTransactions(userId: string): Promise<Transaction[]> {
    try {
      const transactionsData = JSON.parse(localStorage.getItem("transactions") || "{}")
      return Object.values(transactionsData)
        .filter((transaction: any) => transaction.userId === userId)
        .map((transaction: any) => ({
          ...transaction,
          createdAt: new Date(transaction.createdAt),
          updatedAt: new Date(transaction.updatedAt),
        }))
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    } catch (error) {
      console.error("Error getting transactions:", error)
      return []
    }
  }

  // Investment operations
  async createInvestment(investmentData: Omit<Investment, "id" | "createdAt">): Promise<string> {
    try {
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 9)
      const investment: Investment = {
        ...investmentData,
        id,
        createdAt: new Date(),
      }

      this.saveToLocalStorage("investments", investment.id, investment)
      return investment.id
    } catch (error) {
      console.error("Error creating investment:", error)
      throw error
    }
  }

  async getUserInvestments(userId: string): Promise<Investment[]> {
    try {
      const investmentsData = JSON.parse(localStorage.getItem("investments") || "{}")
      return Object.values(investmentsData)
        .filter((investment: any) => investment.userId === userId)
        .map((investment: any) => ({
          ...investment,
          createdAt: new Date(investment.createdAt),
          startDate: new Date(investment.startDate),
          endDate: new Date(investment.endDate),
        }))
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    } catch (error) {
      console.error("Error getting investments:", error)
      return []
    }
  }

  // Verification document operations
  async createVerificationDocument(docData: Omit<VerificationDocument, "id" | "uploadedAt">): Promise<string> {
    try {
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 9)
      const verificationDoc: VerificationDocument = {
        ...docData,
        id,
        status: "approved", // Auto-approve documents
        uploadedAt: new Date(),
        reviewedAt: new Date(),
        reviewedBy: "system",
      }

      this.saveToLocalStorage("verification_documents", verificationDoc.id, verificationDoc)
      return verificationDoc.id
    } catch (error) {
      console.error("Error creating verification document:", error)
      throw error
    }
  }

  // LocalStorage utility methods
  private saveToLocalStorage(collection: string, id: string, data: any): void {
    try {
      const existingData = JSON.parse(localStorage.getItem(collection) || "{}")
      existingData[id] = data
      localStorage.setItem(collection, JSON.stringify(existingData))
    } catch (error) {
      console.error("Error saving to localStorage:", error)
    }
  }

  private getFromLocalStorage(collection: string, id: string): any {
    try {
      const data = JSON.parse(localStorage.getItem(collection) || "{}")
      return data[id] || null
    } catch (error) {
      console.error("Error getting from localStorage:", error)
      return null
    }
  }

  // Create sample data for testing
  async createSampleData(userId: string): Promise<void> {
    try {
      // Create sample transactions
      const sampleTransactions = [
        {
          userId,
          type: "deposit" as const,
          amount: 25000,
          currency: "EUR",
          method: "Bank Transfer",
          status: "completed" as const,
          description: "Initial deposit via Bank Transfer",
        },
        {
          userId,
          type: "investment" as const,
          amount: 15000,
          currency: "EUR",
          method: "Portfolio Investment",
          status: "completed" as const,
          description: "Investment in Premium Plan",
        },
        {
          userId,
          type: "profit" as const,
          amount: 2250,
          currency: "EUR",
          method: "Investment Return",
          status: "completed" as const,
          description: "Monthly profit from Premium Plan",
        },
        {
          userId,
          type: "deposit" as const,
          amount: 40000,
          currency: "EUR",
          method: "Cryptocurrency",
          status: "completed" as const,
          description: "Crypto deposit via Bitcoin",
        },
      ]

      for (const transaction of sampleTransactions) {
        await this.createTransaction(transaction)
      }

      // Create sample investments
      const sampleInvestments = [
        {
          userId,
          planName: "Premium Plan",
          amount: 15000,
          duration: 30,
          expectedReturn: 22500,
          status: "active" as const,
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        {
          userId,
          planName: "Gold Plan",
          amount: 25000,
          duration: 60,
          expectedReturn: 45000,
          status: "active" as const,
          startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() + 46 * 24 * 60 * 60 * 1000),
        },
      ]

      for (const investment of sampleInvestments) {
        await this.createInvestment(investment)
      }
    } catch (error) {
      console.error("Error creating sample data:", error)
    }
  }
}

export const databaseService = new DatabaseService()
