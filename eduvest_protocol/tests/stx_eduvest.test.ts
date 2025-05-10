import { describe, expect, it } from "vitest";

// Mock implementation of the EduVest contract for testing
class MockEduVestContract {
  constructor() {
    this.admin = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
    this.mockBlockHeight = 1;
    this.totalInvestments = 0;
    this.platformFeePercent = 2;
    this.projects = {};
    this.investors = {};
    this.projectInvestors = {};
    this.stxBalances = {
      [this.admin]: 1000000,
    };
  }

  // Admin functions
  setMockBlockHeight(height) {
    this.mockBlockHeight = height;
    return { success: true, value: height };
  }

  setAdmin(newAdmin, sender) {
    if (sender !== this.admin) {
      return { success: false, error: "Unauthorized" };
    }
    this.admin = newAdmin;
    return { success: true, value: newAdmin };
  }

  setPlatformFee(newFee, sender) {
    if (sender !== this.admin) {
      return { success: false, error: "Unauthorized" };
    }
    if (newFee > 10) {
      return { success: false, error: "Invalid amount" };
    }
    this.platformFeePercent = newFee;
    return { success: true, value: newFee };
  }

  // Core functionality
  createProject(title, description, fundingGoal, deadline, sender) {
    if (fundingGoal <= 0) {
      return { success: false, error: "Invalid amount" };
    }
    if (deadline <= this.mockBlockHeight) {
      return { success: false, error: "Deadline passed" };
    }

    const projectId = this.totalInvestments + 1;
    this.projects[projectId] = {
      owner: sender,
      title,
      description,
      fundingGoal,
      currentFunding: 0,
      status: "active",
      investorCount: 0,
      createdAt: this.mockBlockHeight,
      deadline,
    };

    this.totalInvestments = projectId;
    return { success: true, value: projectId };
  }

  investInProject(projectId, amount, sender) {
    // Initialize sender balance if not exists
    if (!this.stxBalances[sender]) {
      this.stxBalances[sender] = 1000000; // Give test users some STX
    }

    const project = this.projects[projectId];
    if (!project) {
      return { success: false, error: "Project not found" };
    }

    if (amount <= 0) {
      return { success: false, error: "Invalid amount" };
    }

    if (project.status !== "active") {
      return { success: false, error: "Project closed" };
    }

    if (this.mockBlockHeight > project.deadline) {
      return { success: false, error: "Deadline passed" };
    }

    if (this.stxBalances[sender] < amount) {
      return { success: false, error: "Insufficient funds" };
    }

    // Calculate fee and investment amount
    const platformFee = Math.floor((amount * this.platformFeePercent) / 100);
    const investmentAmount = amount - platformFee;

    // Update balances
    this.stxBalances[sender] -= amount;
    if (!this.stxBalances[this.admin]) {
      this.stxBalances[this.admin] = 0;
    }
    this.stxBalances[this.admin] += platformFee;

    // Update project
    project.currentFunding += investmentAmount;
    project.investorCount += 1;
    if (project.currentFunding >= project.fundingGoal) {
      project.status = "funded";
    }

    // Update investor records
    if (!this.investors[sender]) {
      this.investors[sender] = {
        investments: [],
        totalInvested: 0,
        rewardsClaimed: 0,
      };
    }
    
    const investorKey = `${projectId}-${sender}`;
    this.projectInvestors[investorKey] = {
      amount: investmentAmount,
      timestamp: this.mockBlockHeight,
    };
    
    this.investors[sender].investments.push(projectId);
    this.investors[sender].totalInvested += investmentAmount;

    return { success: true, value: investmentAmount };
  }

  withdrawFunds(projectId, sender) {
    const project = this.projects[projectId];
    if (!project) {
      return { success: false, error: "Project not found" };
    }

    if (sender !== project.owner) {
      return { success: false, error: "Unauthorized" };
    }

    if (project.status !== "funded" && this.mockBlockHeight <= project.deadline) {
      return { success: false, error: "Project closed" };
    }

    if (project.currentFunding <= 0) {
      return { success: false, error: "Insufficient funds" };
    }

    const amountToWithdraw = project.currentFunding;
    
    // Update balances
    if (!this.stxBalances[sender]) {
      this.stxBalances[sender] = 0;
    }
    this.stxBalances[sender] += amountToWithdraw;
    
    // Update project
    project.currentFunding = 0;
    project.status = "completed";

    return { success: true, value: amountToWithdraw };
  }

  claimRefund(projectId, sender) {
    const project = this.projects[projectId];
    if (!project) {
      return { success: false, error: "Project not found" };
    }

    const investorKey = `${projectId}-${sender}`;
    const investment = this.projectInvestors[investorKey];
    if (!investment) {
      return { success: false, error: "Unauthorized" };
    }

    if (project.status !== "active" || this.mockBlockHeight <= project.deadline) {
      return { success: false, error: "Project closed" };
    }

    if (investment.amount <= 0) {
      return { success: false, error: "Insufficient funds" };
    }

    const refundAmount = investment.amount;
    
    // Update balances
    if (!this.stxBalances[sender]) {
      this.stxBalances[sender] = 0;
    }
    this.stxBalances[sender] += refundAmount;
    
    // Update investment record
    this.projectInvestors[investorKey].amount = 0;

    return { success: true, value: refundAmount };
  }

  // Read-only functions
  getProject(projectId) {
    return this.projects[projectId];
  }

  getInvestorData(investor) {
    return this.investors[investor];
  }

  getInvestmentInProject(projectId, investor) {
    const investorKey = `${projectId}-${investor}`;
    return this.projectInvestors[investorKey];
  }

  getPlatformFee() {
    return this.platformFeePercent;
  }

  getProjectCount() {
    return this.totalInvestments;
  }

  getCurrentBlockHeight() {
    return this.mockBlockHeight;
  }
}

// Test suite
describe("EduVest Protocol Tests", () => {
  let eduvestContract;
  const ADMIN = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
  const USER1 = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG";
  const USER2 = "ST2JHG361ZXG51QTKY2NQCVBPPRRE2KZB1HR05NNC";

  // Set up a fresh contract instance before each test
  beforeEach(() => {
    eduvestContract = new MockEduVestContract();
  });

  describe("Admin Functions", () => {
    it("should set a new admin", () => {
      const result = eduvestContract.setAdmin(USER1, ADMIN);
      expect(result.success).toBe(true);
      expect(result.value).toBe(USER1);
      expect(eduvestContract.admin).toBe(USER1);
    });

    it("should fail when non-admin tries to set new admin", () => {
      const result = eduvestContract.setAdmin(USER1, USER2);
      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
      expect(eduvestContract.admin).toBe(ADMIN);
    });

    it("should set platform fee", () => {
      const result = eduvestContract.setPlatformFee(5, ADMIN);
      expect(result.success).toBe(true);
      expect(result.value).toBe(5);
      expect(eduvestContract.platformFeePercent).toBe(5);
    });

    it("should fail to set platform fee above maximum", () => {
      const result = eduvestContract.setPlatformFee(15, ADMIN);
      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid amount");
      expect(eduvestContract.platformFeePercent).toBe(2); // unchanged
    });
  });

  describe("Project Management", () => {
    it("should create a new project", () => {
      const result = eduvestContract.createProject(
        "Education Platform",
        "A platform for online learning",
        100000,
        100, // deadline
        USER1
      );
      expect(result.success).toBe(true);
      expect(result.value).toBe(1);
      
      const project = eduvestContract.getProject(1);
      expect(project.title).toBe("Education Platform");
      expect(project.owner).toBe(USER1);
      expect(project.status).toBe("active");
    });

    it("should fail to create a project with past deadline", () => {
      eduvestContract.setMockBlockHeight(50);
      const result = eduvestContract.createProject(
        "Education Platform",
        "A platform for online learning",
        100000,
        40, // deadline in the past
        USER1
      );
      expect(result.success).toBe(false);
      expect(result.error).toBe("Deadline passed");
    });
  });

  describe("Investment Functionality", () => {
    beforeEach(() => {
      // Create a test project
      eduvestContract.createProject(
        "Education Platform",
        "A platform for online learning",
        100000,
        100, // deadline
        USER1
      );
    });

    it("should allow investment in a project", () => {
      const result = eduvestContract.investInProject(1, 10000, USER2);
      expect(result.success).toBe(true);
      
      const project = eduvestContract.getProject(1);
      expect(project.currentFunding).toBe(9800); // 2% fee deducted
      expect(project.investorCount).toBe(1);
      
      const investorData = eduvestContract.getInvestorData(USER2);
      expect(investorData.totalInvested).toBe(9800);
      expect(investorData.investments).toContain(1);
    });

    it("should update project status when fully funded", () => {
      eduvestContract.investInProject(1, 110000, USER2); // Overfund to ensure goal is met after fee
      
      const project = eduvestContract.getProject(1);
      expect(project.status).toBe("funded");
    });

    it("should fail to invest after deadline", () => {
      eduvestContract.setMockBlockHeight(110); // Past the deadline
      
      const result = eduvestContract.investInProject(1, 10000, USER2);
      expect(result.success).toBe(false);
      expect(result.error).toBe("Deadline passed");
    });
  });

  describe("Fund Withdrawal & Refunds", () => {
    beforeEach(() => {
      // Create a test project
      eduvestContract.createProject(
        "Education Platform",
        "A platform for online learning",
        100000,
        100, // deadline
        USER1
      );
      // Add investment
      eduvestContract.investInProject(1, 50000, USER2);
    });

    it("should allow project owner to withdraw funds when funded", () => {
      // Fully fund the project
      eduvestContract.investInProject(1, 60000, USER2);
      
      const result = eduvestContract.withdrawFunds(1, USER1);
      expect(result.success).toBe(true);
      
      const project = eduvestContract.getProject(1);
      expect(project.currentFunding).toBe(0);
      expect(project.status).toBe("completed");
    });

    it("should not allow withdrawal if project is not funded before deadline", () => {
      const result = eduvestContract.withdrawFunds(1, USER1);
      expect(result.success).toBe(false);
      expect(result.error).toBe("Project closed");
    });

    it("should allow investors to claim refunds after deadline if not funded", () => {
      eduvestContract.setMockBlockHeight(101); // Just past deadline
      
      const result = eduvestContract.claimRefund(1, USER2);
      expect(result.success).toBe(true);
      
      const investment = eduvestContract.getInvestmentInProject(1, USER2);
      expect(investment.amount).toBe(0); // Refund claimed
    });
  });
});