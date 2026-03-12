export const isPastDate = (dateStr: string) => {
    const requestDate = new Date(dateStr)
    requestDate.setHours(0, 0, 0, 0)
    const today = new Date()
    today.setHours(0, 0, 0, 0,)
    return requestDate.getTime() < today.getTime()
}

export const mapSlotToDurationTime = (slot: string) => {
    if (slot === "Morning") {
        return "09:00 - 12:00"
    }
    else if (slot === "Lunch") {
        return "12:00 - 13:00"
    }
    else if (slot === "Afternoon") {
        return "13:00 - 16:00"
    }
    return "Error"
}