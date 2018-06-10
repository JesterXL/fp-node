const getUserEmail = userID =>
    new Promise(success =>
        setTimeout(
            ()=> success({
                firstName: 'Jesse',
                lastName: 'Warden',
                age: 39,
                email: 'jesterxl@jessewarden.com'
            }),
            1000
        ))

module.exports = {
    getUserEmail
}