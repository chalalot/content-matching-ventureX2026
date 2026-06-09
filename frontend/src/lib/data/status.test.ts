import assert from 'node:assert/strict'
import { isAvailableStatus, isStatus } from './status'

assert.equal(isStatus('ACTIVE', 'active'), true)
assert.equal(isStatus('OPEN', 'open'), true)
assert.equal(isStatus('IN_PROGRESS', 'in_progress'), true)
assert.equal(isStatus('PENDING', 'pending'), true)
assert.equal(isStatus('SUSPENDED', 'active'), false)

assert.equal(isAvailableStatus('TRUE'), true)
assert.equal(isAvailableStatus('True'), true)
assert.equal(isAvailableStatus(true), true)
assert.equal(isAvailableStatus('FALSE'), false)
assert.equal(isAvailableStatus('available'), true)
