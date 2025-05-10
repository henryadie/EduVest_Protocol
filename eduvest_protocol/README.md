
# EduVest Protocol

## Educational Investment Smart Contract on the Stacks Blockchain

EduVest Protocol is a decentralized platform for educational funding built on the Stacks blockchain. It enables individuals to create and fund educational projects through transparent and secure blockchain transactions.

## Overview

The EduVest Protocol allows:
- Project creators to raise funds for educational initiatives
- Investors to support promising educational projects
- Transparent fund management with milestone tracking
- Secure transactions using Stacks (STX) cryptocurrency

## Features

- **Create Educational Projects**: Educators can create projects with funding goals
- **Invest in Education**: Support projects with STX tokens
- **Milestone Tracking**: Track progress of funded educational initiatives
- **Automatic Fund Management**: Smart contract handles fund distribution
- **Refund Mechanism**: Investors can claim refunds if projects don't meet deadlines
- **Low Platform Fees**: Only 2% fee on investments

## Smart Contract Functions

### Administrative Functions
- `set-admin`: Update the admin address
- `set-platform-fee`: Modify the platform fee percentage
- `set-mock-block-height`: Set mock block height for testing (Clarinet only)

### Core Functionality
- `create-project`: Create a new educational funding project
- `invest-in-project`: Invest STX in an educational project
- `withdraw-funds`: Project owners can withdraw funds after successful funding
- `claim-refund`: Investors can claim refunds for unsuccessful projects
- `add-educational-milestone`: Add progress milestones to projects

### Read-Only Functions
- `get-project`: Retrieve project details
- `get-investor-data`: Get investor information
- `get-investment-in-project`: Get specific investment details
- `get-platform-fee`: View the current platform fee
- `get-project-count`: Get the total number of projects
- `get-current-block-height`: Get the current block height (mock for testing)

## Data Structures

### Projects
```
{
  owner: principal,
  title: string,
  description: string,
  funding-goal: uint,
  current-funding: uint,
  status: string,
  investor-count: uint,
  created-at: uint,
  deadline: uint
}
```

### Investors
```
{
  investments: list,
  total-invested: uint,
  rewards-claimed: uint
}
```

### Project Investments
```
{
  amount: uint,
  timestamp: uint
}
```

## Error Codes

- `ERR_UNAUTHORIZED (u1)`: Unauthorized access
- `ERR_PROJECT_NOT_FOUND (u2)`: Project does not exist
- `ERR_INSUFFICIENT_FUNDS (u3)`: Insufficient funds
- `ERR_PROJECT_CLOSED (u4)`: Project is no longer active
- `ERR_ALREADY_CLAIMED (u5)`: Rewards already claimed
- `ERR_DEADLINE_PASSED (u6)`: Project deadline has passed
- `ERR_INVALID_AMOUNT (u7)`: Invalid investment amount

## Development

### Prerequisites
- [Clarinet](https://github.com/hirosystems/clarinet) - Clarity development environment
- [Stacks.js](https://github.com/blockstack/stacks.js) - JavaScript library for Stacks blockchain

### Testing
1. Clone the repository
2. Install Clarinet
3. Run `clarinet console` to interact with the contract
4. Use the mock block height functions for testing timeframes

### Deployment
1. Build the contract with `clarinet build`
2. Deploy to testnet/mainnet using the Stacks CLI or Stacks Wallet

## Example Usage

### Creating a Project
```clarity
(contract-call? .eduvest create-project "Computer Science Scholarship" "Funding for 10 students to learn blockchain development" u10000 u1000)
```

### Investing in a Project
```clarity
(contract-call? .eduvest invest-in-project u1 u500)
```

### Withdrawing Funds (for project owners)
```clarity
(contract-call? .eduvest withdraw-funds u1)
```

## License

[MIT License](LICENSE)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Contact

Project Link: [https://github.com/henryadie/eduvest-protocol](https://github.com/yourusername/eduvest-protocol)