import { describe, it, expect } from 'vitest'
import { isPastDate, mapSlotToDurationTime } from '../../lib/shared/utils/time.js'

describe('isPastDate', () => {
    it('should return true when date is in the past', () => {
        // Arrange
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        // Act
        const result = isPastDate(yesterday.toISOString())
        // Assert
        expect(result).toBe(true)
    })

    it('should return false when date is in the future', () => {
        // Arrange
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        // Act
        const result = isPastDate(tomorrow.toISOString())
        // Assert
        expect(result).toBe(false)
    })

    it('should return false when date is today', () => {
        // Arrange
        const today = new Date()
        // Act
        const result = isPastDate(today.toISOString())
        // Assert
        expect(result).toBe(false)
    })

    it('should return true when yesterday date has time 23:59:59', () => {
        // Arrange
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        yesterday.setHours(23, 59, 59, 999)
        // Act
        const result = isPastDate(yesterday.toISOString())
        // Assert
        expect(result).toBe(true)
    })

})

describe('mapSlotToDurationTime', () => {
    it('should return 09:00 - 12:00 when slot is Morning', () => {
        // Act
        const result = mapSlotToDurationTime('Morning')
        // Assert
        expect(result).toBe('09:00 - 12:00')
    })

    it('should return 12:00 - 13:00 when slot is Lunch', () => {
        // Act
        const result = mapSlotToDurationTime('Lunch')
        // Assert
        expect(result).toBe('12:00 - 13:00')
    })

    it('should return 13:00 - 16:00 when slot is Afternoon', () => {
        // Act
        const result = mapSlotToDurationTime('Afternoon')
        // Assert
        expect(result).toBe('13:00 - 16:00')
    })

    it('should return Error when slot is not recognized', () => {
        // Act
        const result = mapSlotToDurationTime('Evening')
        // Assert
        expect(result).toBe('Error')
    })

    it('should return Error when slot is empty string', () => {
        // Act
        const result = mapSlotToDurationTime('')
        // Assert
        expect(result).toBe('Error')
    })
})