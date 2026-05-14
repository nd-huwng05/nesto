import Apis, {endpoints} from "../configuration/Apis";

export const authApi = async (identifier, password) => {
    if (process.env.EXPO_PRIVATE_MOCK) {
        return new Promise((resolve, reject) => {
            const isValidUser = (identifier === 'test@gmail.com' || identifier === '0899718965')
            if (isValidUser && password === 'Abc123@') {
                resolve({
                    data: {
                        access_token: "mock_token_12345"
                    },
                    status: "success",
                    messages: "Login successfully"
                })
            } else {
                reject({
                    response: {
                        status: "errors",
                        message: "Email or password incorrect"
                    }
                })
            }
        })
    }

    return Apis.post(endpoints['login'], {
        username: identifier,
        password: password,
    })
}

export const sendOTP = async (email) => {
    if (process.env.EXPO_PRIVATE_MOCK) {
        return new Promise((resolve) => {
            resolve({
                response: {
                    'status': 'success',
                    'message': 'Send OTP successfully'
                }
            })
        })
    }
}

export const checkOTP = async (otp) => {
    if (process.env.EXPO_PRIVATE_MOCK) {
        return new Promise((resolve, reject) => {
            if (otp === "000000") resolve({
                response: {
                    status: "success",
                    message: "Check OTP successfully"
                }
            })
            else reject({
                response: {
                    status: "error",
                    message: "OTP Incorrect"
                }
            })
        })
    }

    return Apis.post(endpoints['otp'], {
        otp: otp,
    })
}

export const checkEmailExist = async (email) => {
    if (process.env.EXPO_PRIVATE_MOCK) {
        return new Promise((resolve, reject) => {
            if (email !== 'test@gmail.com') resolve({
                response: {
                    status: "success",
                    message: "Email not exists"
                }
            })
            else reject({
                response: {
                    status: "error",
                    message: "Email exists"
                }
            })
        })
    }

    return Apis.post(endpoints['checkEmail'], {
        email: email
    })
}

export const registerEmail = async (email, password) => {
    if (process.env.EXPO_PRIVATE_MOCK) {
        return new Promise((resolve, reject) => {
            resolve({
                response: {
                    status: "success",
                    message: "Register successfully"
                }
            })
        })
    }
    return Apis.post(endpoints['register'], {
        email: email,
        password: password,
    })
}