import { describe, it, expect } from 'vitest'
import { reservationTemplate, cancelationTemplate } from '../../lib/shared/utils/mail.js'

const mockUser    = { name: 'สมชาย ใจดี', email: 'test@kmitl.ac.th' }
const mockLab     = { lab_name: 'Computer Lab 1' }
const mockBooking = {
    booking_id: 1,
    booking_date: new Date('2025-06-15T00:00:00.000Z'),
    slot: 'Morning',
    tables: {
        table_code: 'A01',
        labs: { lab_name: 'Computer Lab 1' }
    }
}

describe('reservationTemplate', () => {
    it('should contain user name in the output HTML', () => {
        // Act
        const html = reservationTemplate(mockUser, mockLab, 'A01', mockBooking)
        // Assert
        expect(html).toContain('สมชาย ใจดี')
    })

    it('should contain lab name in the output HTML', () => {
        // Act
        const html = reservationTemplate(mockUser, mockLab, 'A01', mockBooking)
        // Assert
        expect(html).toContain('Computer Lab 1')
    })

    it('should contain table code in the output HTML', () => {
        // Act
        const html = reservationTemplate(mockUser, mockLab, 'A01', mockBooking)
        // Assert
        expect(html).toContain('A01')
    })

    it('should contain Morning time range when slot is Morning', () => {
        // Act
        const html = reservationTemplate(mockUser, mockLab, 'A01', mockBooking)
        // Assert
        expect(html).toContain('09:00 - 12:00')
    })

    it('should contain Afternoon time range when slot is Afternoon', () => {
        // Arrange
        const afternoonBooking = { ...mockBooking, slot: 'Afternoon' }
        // Act
        const html = reservationTemplate(mockUser, mockLab, 'B02', afternoonBooking)
        // Assert
        expect(html).toContain('13:00 - 16:00')
    })

    it('should contain Lunch time range when slot is Lunch', () => {
        // Arrange
        const lunchBooking = { ...mockBooking, slot: 'Lunch' }
        // Act
        const html = reservationTemplate(mockUser, mockLab, 'C03', lunchBooking)
        // Assert
        expect(html).toContain('12:00 - 13:00')
    })

    it('should not throw when userInfo is null', () => {
        // Assert
        expect(() =>
        reservationTemplate(null, mockLab, 'A01', mockBooking)
        ).not.toThrow()
    })

    it('should not throw when labInfo is null', () => {
        // Assert
        expect(() =>
        reservationTemplate(mockUser, null, 'A01', mockBooking)
        ).not.toThrow()
    })

    it('should return a non-empty string', () => {
        // Act
        const html = reservationTemplate(mockUser, mockLab, 'A01', mockBooking)
        // Assert
        expect(typeof html).toBe('string')
        expect(html.length).toBeGreaterThan(0)
    })
})

describe('cancelationTemplate', () => {
    it('should contain user name in the output HTML', () => {
        // Act
        const html = cancelationTemplate(mockUser, mockBooking)
        // Assert
        expect(html).toContain('สมชาย ใจดี')
    })

    it('should contain lab name from nested booking object', () => {
        // Act
        const html = cancelationTemplate(mockUser, mockBooking)
        // Assert
        expect(html).toContain('Computer Lab 1')
    })

    it('should contain table code from nested booking object', () => {
        // Act
        const html = cancelationTemplate(mockUser, mockBooking)
        // Assert
        expect(html).toContain('A01')
    })

    it('should contain Morning time range when slot is Morning', () => {
        // Act
        const html = cancelationTemplate(mockUser, mockBooking)
        // Assert
        expect(html).toContain('09:00 - 12:00')
    })

    it('should not throw when booking.tables is undefined', () => {
        // Arrange
        const incompleteBooking = { ...mockBooking, tables: undefined }
        // Assert
        expect(() =>
        cancelationTemplate(mockUser, incompleteBooking)
        ).not.toThrow()
    })

    it('should not throw when userInfo is null', () => {
        // Assert
        expect(() =>
        cancelationTemplate(null, mockBooking)
        ).not.toThrow()
    })

    it('should return a non-empty string', () => {
        // Act
        const html = cancelationTemplate(mockUser, mockBooking)
        // Assert
        expect(typeof html).toBe('string')
        expect(html.length).toBeGreaterThan(0)
    })
})