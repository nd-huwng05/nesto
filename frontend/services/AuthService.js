import Apis, {endpoints} from '../configuration/Apis';
import {authenticateAdmin} from './authMockStore';
import {staffMockStore} from './staffMockStore';

const delay = (ms = 600) => new Promise((r) => setTimeout(r, ms));

export const authApi = async (identifier, password) => {
    if (process.env.EXPO_PRIVATE_MOCK) {
        await delay();

        const adminUser = authenticateAdmin(identifier, password);
        if (adminUser) {
            return {
                status: 'success',
                message: 'Login successfully',
                data: {
                    access_token: `mock_admin_${adminUser.id}`,
                    user: adminUser,
                },
            };
        }

        const staffUser = await staffMockStore.authenticateByCredentials(identifier, password);
        if (staffUser) {
            return {
                status: 'success',
                message: 'Login successfully',
                data: {
                    access_token: `mock_staff_${staffUser.id}`,
                    user: staffUser,
                },
            };
        }

        return Promise.reject({
            response: {
                status: 'error',
                message: 'Email or password is incorrect',
            },
        });
    }

    return Apis.post(endpoints['login'], {
        username: identifier,
        password: password,
    });
};

export const sendOTP = async (email) => {
    if (process.env.EXPO_PRIVATE_MOCK) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    response: {
                        status: 'success',
                        message: 'Send OTP successfully',
                    },
                });
            }, 400);
        });
    }
};

export const checkOTP = async (otp) => {
    if (process.env.EXPO_PRIVATE_MOCK) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (otp === '000000') {
                    resolve({
                        response: {
                            status: 'success',
                            message: 'Check OTP successfully',
                        },
                    });
                } else {
                    reject({
                        response: {
                            status: 'error',
                            message: 'OTP Incorrect',
                        },
                    });
                }
            }, 400);
        });
    }

    return Apis.post(endpoints['otp'], {
        otp: otp,
    });
};

export const checkEmailExist = async (email) => {
    if (process.env.EXPO_PRIVATE_MOCK) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (email !== 'test@gmail.com') {
                    resolve({
                        response: {
                            status: 'success',
                            message: 'Email is available',
                        },
                    });
                } else {
                    reject({
                        response: {
                            status: 'error',
                            message: 'This email is already registered',
                        },
                    });
                }
            }, 500);
        });
    }

    return Apis.post(endpoints['checkEmail'], {
        email: email,
    });
};

export const registerEmail = async (email, password, role) => {
    if (process.env.EXPO_PRIVATE_MOCK) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    status: 'success',
                    message: 'Register successfully',
                    data: {
                        access_token: `mock_token_${Date.now()}`,
                        user: {
                            id: 'manager_new',
                            email,
                            name: email.split('@')[0],
                            role: 'SUPER_ADMIN',
                            branchId: null,
                            businessId: null,
                        },
                    },
                });
            }, 600);
        });
    }
    return Apis.post(endpoints['register'], {
        email: email,
        password: password,
        role: role,
    });
};

export const requestPasswordReset = async (email) => {
    if (process.env.EXPO_PRIVATE_MOCK) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    status: 'success',
                    message: 'If an account exists, a reset link has been sent to your email.',
                });
            }, 800);
        });
    }
    return Apis.post(endpoints['forgot_password'], {email});
};
