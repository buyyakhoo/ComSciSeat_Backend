export function validationError(message: string) {
  return (result: any, c: any) => {
    if (!result.success) {
      return c.json({ success: false, error: message, issues: result.error.issues }, 400)
    }
  }
}
