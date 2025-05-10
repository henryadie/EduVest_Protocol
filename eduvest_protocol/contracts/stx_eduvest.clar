;; EduVest Protocol - Educational Investment Smart Contract
;; A contract for managing educational investments on the Stacks blockchain

;; Define data variables
(define-data-var total-investments uint u0)
(define-data-var platform-fee-percent uint u2)  ;; 2% platform fee
(define-data-var admin principal tx-sender)
(define-data-var mock-block-height uint u0)  ;; Mock block height for testing in Clarinet

;; Define data maps
(define-map investors 
  principal 
  { investments: (list 25 uint), 
    total-invested: uint, 
    rewards-claimed: uint
  }
)

(define-map educational-projects
  uint 
  { 
    owner: principal,
    title: (string-utf8 100),
    description: (string-utf8 500),
    funding-goal: uint,
    current-funding: uint,
    status: (string-ascii 20),
    investor-count: uint,
    created-at: uint,
    deadline: uint
  }
)

(define-map project-investors
  { project-id: uint, investor: principal }
  { amount: uint, timestamp: uint }
)

;; Define error constants
(define-constant ERR_UNAUTHORIZED u1)
(define-constant ERR_PROJECT_NOT_FOUND u2)
(define-constant ERR_INSUFFICIENT_FUNDS u3)
(define-constant ERR_PROJECT_CLOSED u4)
(define-constant ERR_ALREADY_CLAIMED u5)
(define-constant ERR_DEADLINE_PASSED u6)
(define-constant ERR_INVALID_AMOUNT u7)

;; Administrative functions
(define-public (set-admin (new-admin principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err ERR_UNAUTHORIZED))
    (ok (var-set admin new-admin))
  )
)

(define-public (set-platform-fee (new-fee uint))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err ERR_UNAUTHORIZED))
    (asserts! (< new-fee u10) (err ERR_INVALID_AMOUNT)) ;; Maximum 10% fee
    (ok (var-set platform-fee-percent new-fee))
  )
)

;; Mock block height functions for testing in Clarinet
(define-public (set-mock-block-height (new-height uint))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err ERR_UNAUTHORIZED))
    (ok (var-set mock-block-height new-height))
  )
)

(define-read-only (get-current-block-height)
  (var-get mock-block-height)
)

;; Core functionality
(define-public (create-project 
    (title (string-utf8 100)) 
    (description (string-utf8 500)) 
    (funding-goal uint)
    (deadline uint)
  )
  (let (
    (project-id (+ (var-get total-investments) u1))
    (current-block-height (var-get mock-block-height))
  )
    (asserts! (> funding-goal u0) (err ERR_INVALID_AMOUNT))
    (asserts! (> deadline current-block-height) (err ERR_DEADLINE_PASSED))
    
    (map-set educational-projects project-id 
      {
        owner: tx-sender,
        title: title,
        description: description,
        funding-goal: funding-goal,
        current-funding: u0,
        status: "active",
        investor-count: u0,
        created-at: current-block-height,
        deadline: deadline
      }
    )
    (var-set total-investments project-id)
    (ok project-id)
  )
)

(define-public (invest-in-project (project-id uint) (amount uint))
  (let (
    (project (unwrap! (map-get? educational-projects project-id) (err ERR_PROJECT_NOT_FOUND)))
    (current-block-height (var-get mock-block-height))
    (investor-data (default-to { investments: (list ), total-invested: u0, rewards-claimed: u0 } 
                               (map-get? investors tx-sender)))
    (platform-fee (/ (* amount (var-get platform-fee-percent)) u100))
    (investment-amount (- amount platform-fee))
    (updated-funding (+ (get current-funding project) investment-amount))
    (updated-investor-count (+ (get investor-count project) u1))
  )
    ;; Validations
    (asserts! (> amount u0) (err ERR_INVALID_AMOUNT))
    (asserts! (is-eq (get status project) "active") (err ERR_PROJECT_CLOSED))
    (asserts! (<= current-block-height (get deadline project)) (err ERR_DEADLINE_PASSED))
    
    ;; Execute STX transfer
    (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))
    
    ;; Transfer platform fee to admin
    (try! (as-contract (stx-transfer? platform-fee (as-contract tx-sender) (var-get admin))))
    
    ;; Update project funding
    (map-set educational-projects project-id 
      (merge project {
        current-funding: updated-funding,
        investor-count: updated-investor-count,
        status: (if (>= updated-funding (get funding-goal project)) "funded" "active")
      })
    )
    
    ;; Update investor data
    (map-set project-investors { project-id: project-id, investor: tx-sender }
      { amount: investment-amount, timestamp: current-block-height }
    )
    
    ;; Update investor's total investments
    (map-set investors tx-sender
      { 
        investments: (unwrap! (as-max-len? 
                                (append (get investments investor-data) project-id) 
                                u25) 
                              (err u100)),
        total-invested: (+ (get total-invested investor-data) investment-amount),
        rewards-claimed: (get rewards-claimed investor-data)
      }
    )
    
    (ok investment-amount)
  )
)

(define-public (withdraw-funds (project-id uint))
  (let (
    (project (unwrap! (map-get? educational-projects project-id) (err ERR_PROJECT_NOT_FOUND)))
    (current-funding (get current-funding project))
    (current-block-height (var-get mock-block-height))
  )
    ;; Validations
    (asserts! (is-eq tx-sender (get owner project)) (err ERR_UNAUTHORIZED))
    (asserts! (or (is-eq (get status project) "funded") 
                  (> current-block-height (get deadline project))) 
              (err ERR_PROJECT_CLOSED))
    (asserts! (> current-funding u0) (err ERR_INSUFFICIENT_FUNDS))
    
    ;; Transfer funds to project owner
    (try! (as-contract (stx-transfer? current-funding (as-contract tx-sender) (get owner project))))
    
    ;; Update project status
    (map-set educational-projects project-id 
      (merge project {
        current-funding: u0,
        status: "completed"
      })
    )
    
    (ok current-funding)
  )
)

(define-public (claim-refund (project-id uint))
  (let (
    (project (unwrap! (map-get? educational-projects project-id) (err ERR_PROJECT_NOT_FOUND)))
    (investment (unwrap! (map-get? project-investors { project-id: project-id, investor: tx-sender }) 
                        (err ERR_UNAUTHORIZED)))
    (amount (get amount investment))
    (current-block-height (var-get mock-block-height))
  )  
    ;; Validations
    (asserts! (and (is-eq (get status project) "active") 
                  (> current-block-height (get deadline project))) 
              (err ERR_PROJECT_CLOSED))
    (asserts! (> amount u0) (err ERR_INSUFFICIENT_FUNDS))
    
    ;; Process refund
    (try! (as-contract (stx-transfer? amount (as-contract tx-sender) tx-sender)))
    
    ;; Update project investor data
    (map-set project-investors { project-id: project-id, investor: tx-sender }
      { amount: u0, timestamp: (get timestamp investment) }
    )
    
    (ok amount)
  )
)

;; Read-only functions
(define-read-only (get-project (project-id uint))
  (map-get? educational-projects project-id)
)

(define-read-only (get-investor-data (investor principal))
  (map-get? investors investor)
)

(define-read-only (get-investment-in-project (project-id uint) (investor principal))
  (map-get? project-investors { project-id: project-id, investor: investor })
)

(define-read-only (get-platform-fee)
  (var-get platform-fee-percent)
)

(define-read-only (get-project-count)
  (var-get total-investments)
)

;; Additional features for educational support
(define-public (add-educational-milestone (project-id uint) (milestone-title (string-utf8 100)) (milestone-description (string-utf8 500)))
  (let (
    (project (unwrap! (map-get? educational-projects project-id) (err ERR_PROJECT_NOT_FOUND)))
  )
    (asserts! (is-eq tx-sender (get owner project)) (err ERR_UNAUTHORIZED))
    
    ;; This would typically add to a milestone map, but for simplicity we're just returning ok
    ;; In a full implementation, you would track milestones in a separate map
    (ok true)
  )
)

;; Initialize admin
(define-private (initialize)
  (begin
    (var-set admin tx-sender)
    (var-set mock-block-height u1) ;; Initialize with block height 1
    true
  )
)

(begin
  (initialize)
)