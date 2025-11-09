# Technical Decision Records

This document records significant technical decisions made during the development of ChainEquity, along with the rationale and trade-offs considered.

---

## Table of Contents

- [ADR-001: Virtual Stock Split Implementation](#adr-001-virtual-stock-split-implementation)
- [ADR-002: Wallet Allowlist Approach](#adr-002-wallet-allowlist-approach)
- [ADR-003: Off-Chain Indexing with SQLite](#adr-003-off-chain-indexing-with-sqlite)
- [ADR-004: Hardhat 3.0 and Viem Selection](#adr-004-hardhat-30-and-viem-selection)
- [ADR-005: Basis Points for Split Multipliers](#adr-005-basis-points-for-split-multipliers)
- [ADR-006: Express.js for Backend API](#adr-006-expressjs-for-backend-api)
- [ADR-007: Event-Driven Architecture](#adr-007-event-driven-architecture)
- [ADR-008: Owner Centralization vs Decentralization](#adr-008-owner-centralization-vs-decentralization)
- [ADR-009: Gas Optimization Strategy](#adr-009-gas-optimization-strategy)
- [ADR-010: Testing Strategy](#adr-010-testing-strategy)

---

## ADR-001: Virtual Stock Split Implementation

**Status:** Accepted

**Date:** 2024-10

**Context:**

Traditional stock splits on blockchain require iterating through all token holders to update their balances. This approach:
- Has O(n) gas cost where n = number of holders
- Becomes prohibitively expensive with many holders
- Can exceed block gas limits
- Is slow and expensive

**Decision:**

Implement a virtual stock split mechanism using a global `splitMultiplier`:

```solidity
function balanceOf(address account) public view override returns (uint256) {
    uint256 rawBalance = super.balanceOf(account);
    return (rawBalance * splitMultiplier) / BASIS_POINTS;
}
```

**Rationale:**

1. **Constant Gas Cost**: Split execution costs ~30k gas regardless of holder count
2. **Scalability**: Works with unlimited number of holders
3. **Instant Application**: All balances updated immediately
4. **Historical Tracking**: Events provide audit trail
5. **Simplicity**: Clean implementation with minimal code

**Consequences:**

**Positive:**
- Massive gas savings (O(1) vs O(n))
- Enables frequent corporate actions
- No risk of hitting gas limits
- Transparent to external systems (balanceOf returns adjusted value)

**Negative:**
- Requires custom balanceOf implementation
- Storage balances differ from effective balances
- Need careful handling of internal vs external balances
- Additional complexity in transfer logic

**Alternatives Considered:**

1. **Traditional Rebalancing**: Iterate and update all balances
   - Rejected: Too expensive at scale

2. **Snapshot-Based**: Record split events, calculate on read
   - Rejected: More complex, harder to audit

3. **Proxy Contract**: Upgrade contract with new balances
   - Rejected: Adds upgrade complexity, migration risks

**References:**
- contracts/ChainEquityToken.sol:184-192
- GAS_REPORT.md

---

## ADR-002: Wallet Allowlist Approach

**Status:** Accepted

**Date:** 2024-10

**Context:**

Tokenized securities require transfer restrictions for regulatory compliance:
- KYC/AML requirements
- Accredited investor restrictions
- Securities law compliance
- Prevent unauthorized trading

**Decision:**

Implement a simple allowlist mechanism:
- Owner maintains approved wallet list
- Transfers only allowed between approved wallets
- Approval/revocation emits events

```solidity
mapping(address => bool) private approvedWallets;

function _update(address from, address to, uint256 value) internal override {
    if (from != address(0) && !approvedWallets[from]) revert WalletNotApproved(from);
    if (to != address(0) && !approvedWallets[to]) revert WalletNotApproved(to);
    super._update(from, to, value);
}
```

**Rationale:**

1. **Simple and Effective**: Easy to understand and audit
2. **Gas Efficient**: Single SLOAD per transfer
3. **Flexible**: Owner can approve/revoke as needed
4. **Event Tracking**: All approvals/revocations logged
5. **Compliance Ready**: Foundation for KYC/AML integration

**Consequences:**

**Positive:**
- Regulatory compliance capability
- Prevents unauthorized transfers
- Simple implementation
- Low gas overhead

**Negative:**
- Centralized control (owner dependency)
- Manual approval process
- No built-in KYC/AML
- Requires off-chain approval workflow

**Alternatives Considered:**

1. **Role-Based Access Control**: Multiple approval tiers
   - Rejected: Overkill for initial version

2. **Time-Locked Approvals**: Automatic expiration
   - Rejected: Adds complexity, unclear regulatory benefit

3. **Merkle Tree Allowlist**: Gas-efficient for many wallets
   - Rejected: More complex, harder to update

4. **No Restrictions**: Open transfers
   - Rejected: Doesn't meet regulatory requirements

**Future Enhancements:**
- Integration with KYC providers
- Automated approval workflows
- Tiered access levels
- Time-limited approvals

---

## ADR-003: Off-Chain Indexing with SQLite

**Status:** Accepted

**Date:** 2024-10

**Context:**

Need to provide fast queries for:
- Cap table generation
- Balance history
- Analytics and reporting
- Corporate action history

On-chain storage is expensive and querying is limited.

**Decision:**

Use off-chain event indexing with SQLite database:
- Index all contract events
- Store balances, events, corporate actions
- Provide REST API for queries
- Use Alchemy SDK for reliable event streaming

**Rationale:**

1. **Performance**: Sub-100ms queries vs seconds on-chain
2. **Cost**: Zero gas cost for reads
3. **Flexibility**: Complex queries, aggregations, analytics
4. **Historical Data**: Full event history with timestamps
5. **SQLite Simplicity**: No external database server needed

**Consequences:**

**Positive:**
- Fast queries (10-100ms)
- Complex analytics possible
- No query gas costs
- Rich historical data
- Simple deployment (single file DB)

**Negative:**
- Introduces centralization (API server)
- Requires event synchronization
- Potential data consistency issues
- Single point of failure
- Not trustless

**Alternatives Considered:**

1. **The Graph**: Decentralized indexing
   - Rejected: Overkill for initial version, added complexity

2. **Direct RPC Queries**: Query blockchain directly
   - Rejected: Too slow, expensive, limited functionality

3. **PostgreSQL**: Production database
   - Accepted for future: SQLite for dev, PostgreSQL for production

4. **No Indexing**: Only on-chain queries
   - Rejected: Too slow, limited functionality

**Migration Path:**
- SQLite for development and small deployments
- PostgreSQL for production scaling
- Maintain same API interface

**References:**
- backend/src/db/database.ts
- backend/src/services/eventListener.ts

---

## ADR-004: Hardhat 3.0 and Viem Selection

**Status:** Accepted

**Date:** 2024-10

**Context:**

Need modern development tooling for Ethereum smart contracts:
- Fast compilation and testing
- TypeScript support
- Network simulation
- Good developer experience

**Decision:**

Use Hardhat 3.0 (beta) with Viem instead of Ethers.js:
- Hardhat for development environment
- Viem for contract interactions
- Node.js native test runner

**Rationale:**

1. **Modern Stack**: Latest tools and patterns
2. **TypeScript First**: Better type safety
3. **Viem Performance**: Faster than Ethers.js
4. **Tree-Shakeable**: Smaller bundle sizes
5. **Better DX**: Improved developer experience

**Consequences:**

**Positive:**
- Modern, maintained tooling
- Excellent TypeScript support
- Fast test execution
- Good documentation
- Future-proof stack

**Negative:**
- Beta software (Hardhat 3.0)
- Smaller community vs Ethers.js
- Learning curve for Viem
- Some features still maturing

**Alternatives Considered:**

1. **Foundry**: Rust-based tooling
   - Rejected: TypeScript ecosystem preferred for full-stack

2. **Hardhat 2.x + Ethers.js**: Stable, mature
   - Rejected: Wanted latest features and performance

3. **Truffle**: Legacy framework
   - Rejected: Outdated, less active development

**Migration Considerations:**
- Can migrate to stable Hardhat when 3.0 releases
- Viem API is stable
- Test infrastructure portable

---

## ADR-005: Basis Points for Split Multipliers

**Status:** Accepted

**Date:** 2024-10

**Context:**

Need to represent split multipliers with precision:
- 2:1 split = 2.0x multiplier
- 1:2 reverse split = 0.5x multiplier
- Support fractional splits

Options for representation:
- Decimal: Limited precision
- Fixed-point: Custom implementation
- Basis points: Standard financial convention

**Decision:**

Use basis points (1/10000) for multiplier representation:
- 10000 basis points = 1.0x (no split)
- 20000 basis points = 2.0x (2:1 forward)
- 5000 basis points = 0.5x (1:2 reverse)

```solidity
uint256 constant BASIS_POINTS = 10000;
uint256 public splitMultiplier = BASIS_POINTS;

function balanceOf(address account) public view returns (uint256) {
    return (rawBalance * splitMultiplier) / BASIS_POINTS;
}
```

**Rationale:**

1. **Standard Convention**: Used in traditional finance
2. **Precision**: 0.01% precision (1 basis point)
3. **Integer Math**: Avoids floating point issues
4. **Gas Efficient**: Simple multiplication/division
5. **Human Readable**: Easy to understand (20000 = 2.0x)

**Consequences:**

**Positive:**
- Clear, unambiguous representation
- Sufficient precision for all use cases
- Standard financial terminology
- Simple math operations
- No rounding errors

**Negative:**
- Not immediately obvious (need to divide by 10000)
- Could be confused with percentages
- Requires conversion for display

**Alternatives Considered:**

1. **Percentage**: 10000 = 100%
   - Rejected: Confusing for multipliers > 100%

2. **Fixed-Point (18 decimals)**: Like ETH wei
   - Rejected: Overkill precision, confusing

3. **Numerator/Denominator**: Store as fraction
   - Rejected: More storage, complex calculations

4. **Simple Integer**: 2 = 2x split
   - Rejected: Can't represent fractional splits precisely

**Examples:**
- 2:1 split: `executeSplit(20000)`
- 3:1 split: `executeSplit(30000)`
- 1:2 reverse: `executeSplit(5000)`
- 1.5:1 split: `executeSplit(15000)`

---

## ADR-006: Express.js for Backend API

**Status:** Accepted

**Date:** 2024-10

**Context:**

Need a backend API for:
- Cap table queries
- Analytics
- Corporate action history
- Contract interactions

Options: Express, Fastify, NestJS, tRPC, etc.

**Decision:**

Use Express.js with TypeScript:
- Express 4.x for HTTP server
- TypeScript for type safety
- SQLite for data storage
- REST API architecture

**Rationale:**

1. **Maturity**: Battle-tested, stable
2. **Ecosystem**: Huge middleware ecosystem
3. **Simple**: Easy to understand and maintain
4. **Flexible**: Not opinionated, easy to customize
5. **Documentation**: Extensive resources available

**Consequences:**

**Positive:**
- Fast development
- Easy to find developers
- Lots of middleware available
- Good performance
- Simple deployment

**Negative:**
- Not the fastest framework (vs Fastify)
- Less structure than NestJS
- Callback-based (not modern async patterns)
- Requires more boilerplate

**Alternatives Considered:**

1. **Fastify**: Faster, modern
   - Rejected: Ecosystem less mature

2. **NestJS**: Structured, opinionated
   - Rejected: Overkill for API scope

3. **tRPC**: Type-safe, modern
   - Rejected: Requires specific client setup

4. **GraphQL**: Flexible queries
   - Considered for future: REST sufficient for v1

**Architecture Decisions:**
- Factory pattern for routes (dependency injection)
- Separate service layer for business logic
- Middleware for cross-cutting concerns
- Environment-based configuration

**References:**
- backend/src/server.ts
- backend/src/api/*.routes.ts

---

## ADR-007: Event-Driven Architecture

**Status:** Accepted

**Date:** 2024-10

**Context:**

Need to keep off-chain database synchronized with on-chain state:
- Track all transfers
- Monitor corporate actions
- Update balances in real-time
- Maintain audit trail

**Decision:**

Use event-driven architecture with Alchemy SDK:
- Smart contract emits events for all state changes
- Event listener subscribes to contract events
- Events trigger database updates
- Eventually consistent model

```typescript
class EventListenerService {
  async start() {
    alchemy.ws.on({
      address: tokenAddress,
      topics: [transferTopic]
    }, (log) => this.processTransfer(log));
  }
}
```

**Rationale:**

1. **Reliable**: Alchemy provides guaranteed delivery
2. **Real-Time**: WebSocket updates as blocks are mined
3. **Scalable**: Asynchronous processing
4. **Audit Trail**: All events stored for history
5. **Decoupled**: Contract independent of indexer

**Consequences:**

**Positive:**
- Real-time updates
- Full event history
- Reliable delivery
- Scalable architecture
- Clear separation of concerns

**Negative:**
- Eventually consistent (not immediate)
- Requires event listener uptime
- Potential for missed events
- Complex error handling
- Dependency on Alchemy

**Alternatives Considered:**

1. **Polling**: Periodic blockchain queries
   - Rejected: Inefficient, delays, expensive

2. **The Graph**: Decentralized indexing
   - Rejected: Overkill, more complex

3. **Direct RPC WebSocket**: Self-managed
   - Rejected: Less reliable, more maintenance

4. **Synchronous Updates**: Update DB in transactions
   - Rejected: Not possible (on-chain vs off-chain)

**Error Handling:**
- Retry failed event processing
- Store last processed block
- Resume from checkpoint on restart
- Monitor for gaps in block numbers

**References:**
- backend/src/services/eventListener.ts
- backend/src/config/alchemy.config.ts

---

## ADR-008: Owner Centralization vs Decentralization

**Status:** Accepted with Future Improvements

**Date:** 2024-10

**Context:**

Tokenized securities require some centralized control:
- Minting tokens (issuance)
- Approving wallets (KYC/AML)
- Corporate actions (splits, name changes)
- Regulatory compliance

Need to balance control with decentralization.

**Decision:**

Use OpenZeppelin `Ownable` pattern initially:
- Single owner address
- Owner can execute privileged functions
- Plan migration to multisig

**Rationale:**

1. **Simple**: Easy to implement and test
2. **Standard**: Well-understood pattern
3. **Flexible**: Can upgrade to multisig
4. **Compliant**: Meets initial regulatory needs
5. **Audited**: OpenZeppelin code is secure

**Consequences:**

**Positive:**
- Clear responsibility
- Simple access control
- Easy to reason about
- Standard pattern
- Good for MVP

**Negative:**
- Single point of failure
- Centralized control
- Key management risk
- Trust requirement
- Not truly decentralized

**Future Improvements:**

1. **Multisig Ownership**: Use Gnosis Safe
   ```solidity
   // Transfer ownership to multisig
   transferOwnership(gnosisSafeAddress);
   ```

2. **Timelock**: Delay for sensitive operations
   ```solidity
   // Add 24h delay for splits
   executeWithTimelock(executeSplit, 24 hours);
   ```

3. **Role-Based Access**: Separate concerns
   ```solidity
   // Different roles for different operations
   grantRole(MINTER_ROLE, minterAddress);
   grantRole(APPROVER_ROLE, complianceAddress);
   ```

4. **DAO Governance**: Community voting
   - Could migrate to on-chain governance
   - Snapshot voting for corporate actions
   - Token holder participation

**Alternatives Considered:**

1. **Immediate Multisig**: Start with Gnosis Safe
   - Rejected: Added complexity for development

2. **Role-Based Access Control**: Multiple roles
   - Accepted for future: Start simple, add later

3. **No Owner**: Fully decentralized
   - Rejected: Doesn't meet regulatory requirements

4. **Upgradeable Proxy**: Allow contract upgrades
   - Rejected: Adds complexity, upgrade risks

**References:**
- contracts/ChainEquityToken.sol:8
- OpenZeppelin Ownable documentation

---

## ADR-009: Gas Optimization Strategy

**Status:** Accepted

**Date:** 2024-10

**Context:**

Gas costs directly impact user experience:
- High gas = poor UX
- Users may avoid platform
- Costs add up with many operations

Goal: Minimize gas consumption while maintaining security and functionality.

**Decision:**

Multi-faceted gas optimization strategy:

1. **Compiler Optimization**: Enable optimizer with 200 runs
2. **Storage Optimization**: Minimize SSTORE operations
3. **Virtual Splits**: Avoid iteration over holders
4. **Efficient Data Structures**: Use mappings over arrays
5. **View Functions**: No gas for reads

**Rationale:**

Gas optimization is critical for:
- User adoption
- Frequent operations
- Scalability
- Cost predictability

**Specific Optimizations:**

```solidity
// 1. Pack storage variables
uint256 public splitMultiplier = BASIS_POINTS; // Single slot

// 2. Use immutable for constants
address public immutable override owner;

// 3. Efficient checks-effects-interactions
function _update(...) internal override {
    // Checks first
    if (!approvedWallets[from]) revert;
    // Effects
    super._update(from, to, value);
    // Interactions (none in this case)
}

// 4. Avoid loops
// No iteration in executeSplit()

// 5. Minimal event data
emit StockSplit(multiplierBasisPoints, splitMultiplier);
```

**Results:**

| Operation | Gas Cost | Target | Status |
|-----------|----------|--------|--------|
| Transfer | 39,041 | 100,000 | ✅ -61% |
| Mint | 38,850-73,050 | 80,000 | ✅ |
| Stock Split | 30,246 | 50,000 | ✅ -40% |

**Consequences:**

**Positive:**
- 14-25% more efficient than standard ERC-20
- All operations well below targets
- Predictable costs
- Excellent UX

**Negative:**
- More complex code in some areas
- Requires careful testing
- Some readability tradeoffs

**Alternatives Considered:**

1. **No Optimization**: Simple code, high gas
   - Rejected: Poor user experience

2. **Assembly**: Maximum optimization
   - Rejected: Security risks, hard to maintain

3. **L2 Deployment**: Inherently lower gas
   - Accepted for future: Works on L1 and L2

**References:**
- GAS_REPORT.md
- hardhat.config.ts
- scripts/gas-benchmark.ts

---

## ADR-010: Testing Strategy

**Status:** Accepted

**Date:** 2024-10

**Context:**

Comprehensive testing is critical for:
- Security (handling real assets)
- Regulatory compliance
- User confidence
- Code maintainability

**Decision:**

Multi-layered testing approach:

1. **Smart Contract Unit Tests**: Node.js test runner + Viem
2. **Backend Integration Tests**: Jest + Supertest
3. **Gas Benchmarking**: Custom scripts
4. **Manual Testing**: Local development

```
Testing Pyramid:
       /\
      /E2\      Manual Testing
     /____\
    /      \    Integration Tests (42)
   /________\
  /          \  Unit Tests (33)
 /__________\
```

**Test Coverage:**

**Smart Contracts (33 tests):**
- Deployment and initialization
- Wallet approval/revocation
- Token minting
- Transfers
- Stock splits
- Metadata updates
- Access control
- Error cases

**Backend API (42 tests):**
- Cap table endpoints
- Analytics endpoints
- Corporate actions API
- Database operations
- Error handling

**Gas Benchmarking:**
- All operations measured
- Min/avg/max recorded
- Compared against targets

**Rationale:**

1. **Confidence**: Catch bugs before production
2. **Documentation**: Tests as specifications
3. **Regression Prevention**: Tests prevent breaking changes
4. **Refactoring Safety**: Confident code changes
5. **Security**: Verify access controls work

**Consequences:**

**Positive:**
- High confidence in code
- Easier refactoring
- Better documentation
- Fewer production bugs
- Security assurance

**Negative:**
- More code to maintain
- Slower development initially
- Test maintenance overhead

**Test Quality Standards:**
- Every public function tested
- Both success and failure cases
- Edge cases covered
- Gas costs measured
- Integration tests for API

**Continuous Integration:**
```bash
# Pre-commit checks
npm run lint
npm test

# CI pipeline
- Lint check
- Unit tests
- Integration tests
- Gas benchmarks
- Coverage report
```

**Alternatives Considered:**

1. **Manual Testing Only**
   - Rejected: Not scalable, error-prone

2. **Automated Tests Only**
   - Rejected: Need manual verification too

3. **Foundry Tests**: Solidity-based tests
   - Considered for future: TypeScript preferred for now

**References:**
- test/ChainEquityToken.ts
- backend/src/__tests__/

---

## Decision Review Process

All significant technical decisions should:

1. **Document**: Create ADR following template
2. **Discuss**: Review with team/community
3. **Decide**: Make final decision with rationale
4. **Implement**: Build with decision in mind
5. **Review**: Revisit decisions periodically

**ADR Template:**
```markdown
## ADR-XXX: Title

**Status:** Proposed/Accepted/Deprecated/Superseded

**Date:** YYYY-MM

**Context:** What is the issue?

**Decision:** What did we decide?

**Rationale:** Why did we decide this?

**Consequences:** What are the implications?

**Alternatives Considered:** What else did we consider?

**References:** Links to code/docs
```

---

## Future Decisions to Document

- Layer 2 deployment strategy
- Multi-chain support approach
- KYC/AML integration
- Governance mechanism
- Upgrade strategy
- Database scaling (SQLite → PostgreSQL)
- API versioning strategy
- WebSocket implementation

---

**Last Updated:** 2025-11-04
**Version:** 0.10.2
