const MOCK_DELAY_MS = 350;

const USERS = [
    {
        id: 'user-1',
        email: 'test@gmail.com',
        phone: '0899718965',
        password: 'Abc123@1',
        full_name: 'Nesto User',
        created_at: '2026-05-01T10:15:00.000Z',
        updated_at: '2026-05-01T10:15:00.000Z',
    },
];

const HOTELS = [
    {
        id: 'hotel-1',
        name: 'Swiss Hotel',
        location: '211B Baker Street, London, England',
        description: 'Hotel Room means an area that is designed and constructed to be occupied by one or more persons on Hotel Property, which is separate from sleeping area.',
        rating: 4.6,
        reviews: 1321,
        hero_image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?fit=crop&w=1400&q=80',
        gallery: [
            'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?fit=crop&w=900&q=80',
            'https://images.unsplash.com/photo-1564501049412-61c2a3083791?fit=crop&w=900&q=80',
            'https://images.unsplash.com/photo-1444201983204-c43cbd584d93?fit=crop&w=900&q=80',
        ],
        rooms: [
            {
                id: 'room-1',
                name: 'Standard Room',
                description: 'Comfortable room for everyday stay.',
                type: 'Family',
                view: 'Beach',
                image: 'https://images.unsplash.com/photo-1462396881884-de2c07cb95ed?fit=crop&w=720&q=80',
                price: {
                    amount: 270,
                    currency: 'USD',
                },
                created_at: '2026-05-01T10:15:00.000Z',
                updated_at: '2026-05-01T10:15:00.000Z',
            },
            {
                id: 'room-2',
                name: 'VIP Room',
                description: 'Spacious room with upgraded comfort and service.',
                type: 'Business',
                view: 'City',
                image: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?fit=crop&w=720&q=80',
                price: {
                    amount: 160,
                    currency: 'USD',
                },
                created_at: '2026-05-01T10:15:00.000Z',
                updated_at: '2026-05-01T10:15:00.000Z',
            },
            {
                id: 'room-3',
                name: 'Super VIP Room',
                description: 'Premium suite with top-tier amenities and privacy.',
                type: 'Suite',
                view: 'Ocean',
                image: 'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?fit=crop&w=720&q=80',
                price: {
                    amount: 420,
                    currency: 'USD',
                },
                created_at: '2026-05-01T10:15:00.000Z',
                updated_at: '2026-05-01T10:15:00.000Z',
            },
        ],
        created_at: '2026-05-01T10:15:00.000Z',
        updated_at: '2026-05-01T10:15:00.000Z',
    },
];

const HOTEL_REVIEWS = {
    'hotel-1': [
        {
            id: 'review-1',
            title: 'Watchlish',
            subtitle: "Review's customer were used room",
            reviewer: 'Ngoc Lan',
            review: 'The view is very beautifull',
            image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?fit=crop&w=1400&q=80&fm=jpg',
            avatar: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?fit=crop&w=500&q=80&fm=jpg',
        },
        {
            id: 'review-2',
            title: 'Watchlish',
            subtitle: "Review's customer were used room",
            reviewer: 'Hoang Minh',
            review: 'Service is friendly and room is very clean',
            image: 'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?fit=crop&w=1400&q=80&fm=jpg',
            avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?fit=crop&w=500&q=80&fm=jpg',
        },
        {
            id: 'review-3',
            title: 'Watchlish',
            subtitle: "Review's customer were used room",
            reviewer: 'My Anh',
            review: 'Breakfast was good and location is convenient',
            image: 'https://images.unsplash.com/photo-1468824357306-a439d58ccb1c?fit=crop&w=1400&q=80&fm=jpg',
            avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?fit=crop&w=500&q=80&fm=jpg',
        },
    ],
};

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildSuccess(data, message = 'OK', statusCode = 200, meta = undefined) {
    return {
        success: true,
        statusCode,
        message,
        data,
        meta,
    };
}

function buildError({
    message,
    statusCode = 400,
    code = 'BAD_REQUEST',
    errors = null,
}) {
    const error = {
        success: false,
        statusCode,
        code,
        message,
        errors,
        response: {
            status: 'error',
            statusCode,
            message,
            errors,
            code,
        },
    };

    return error;
}

function throwError(payload) {
    throw buildError(payload);
}

function paginate(items, page = 1, pageSize = 10) {
    const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
    const safePageSize = Number.isFinite(pageSize) && pageSize > 0 ? Math.floor(pageSize) : 10;

    const start = (safePage - 1) * safePageSize;
    const end = start + safePageSize;
    const data = items.slice(start, end);

    return {
        data,
        meta: {
            pagination: {
                page: safePage,
                pageSize: safePageSize,
                total: items.length,
                totalPages: Math.ceil(items.length / safePageSize),
                hasNext: end < items.length,
                hasPrev: safePage > 1,
            },
        },
    };
}

function normalizeIdentifier(value = '') {
    return String(value).trim().toLowerCase();
}

function findUserByIdentifier(identifier) {
    const normalized = normalizeIdentifier(identifier);
    return USERS.find((user) => normalizeIdentifier(user.email) === normalized || normalizeIdentifier(user.phone) === normalized);
}

export async function fakeGet(path, query = {}) {
    await delay(MOCK_DELAY_MS);

    if (path === '/home-detail/') {
        return buildSuccess(HOTELS[0], 'Fetch home detail successfully');
    }

    if (path === '/hotels/') {
        const page = Number(query.page ?? 1);
        const pageSize = Number(query.pageSize ?? 10);
        const {data, meta} = paginate(HOTELS, page, pageSize);
        return buildSuccess(data, 'Fetch hotels successfully', 200, meta);
    }

    throwError({
        statusCode: 404,
        code: 'ENDPOINT_NOT_FOUND',
        message: `Fake GET route is not implemented: ${path}`,
    });
}

export async function fakeGetHomeDetail() {
    const envelope = await fakeGet('/home-detail/');
    return envelope.data;
}

export async function fakeGetReviews(hotelId = 'hotel-1') {
    await delay(MOCK_DELAY_MS);
    const key = String(hotelId || '').trim();
    const reviews = HOTEL_REVIEWS[key] || HOTEL_REVIEWS['hotel-1'] || [];
    return reviews;
}

export async function fakePost(path, payload = {}) {
    await delay(MOCK_DELAY_MS);

    if (path === '/login/') {
        const identifier = payload?.username;
        const password = String(payload?.password ?? '');

        if (!identifier || !password) {
            throwError({
                statusCode: 422,
                code: 'VALIDATION_ERROR',
                message: 'Validation failed',
                errors: {
                    username: !identifier ? ['This field is required.'] : undefined,
                    password: !password ? ['This field is required.'] : undefined,
                },
            });
        }

        const user = findUserByIdentifier(identifier);
        if (!user || user.password !== password) {
            throwError({
                statusCode: 401,
                code: 'INVALID_CREDENTIALS',
                message: 'Email or password incorrect',
            });
        }

        return buildSuccess(
            {
                access_token: 'mock_token_12345',
                token_type: 'Bearer',
                expires_in: 3600,
                user: {
                    id: user.id,
                    email: user.email,
                    phone: user.phone,
                    full_name: user.full_name,
                },
            },
            'Login successfully'
        );
    }

    if (path === '/otp/') {
        if (payload?.otp !== '000000') {
            throwError({
                statusCode: 400,
                code: 'OTP_INVALID',
                message: 'OTP Incorrect',
                errors: {
                    otp: ['OTP code is invalid.'],
                },
            });
        }

        return buildSuccess({verified: true}, 'Check OTP successfully');
    }

    if (path === '/send-otp/') {
        const email = String(payload?.email ?? '').trim();
        if (!email) {
            throwError({
                statusCode: 422,
                code: 'VALIDATION_ERROR',
                message: 'Validation failed',
                errors: {
                    email: ['This field is required.'],
                },
            });
        }

        return buildSuccess({sent: true}, 'Send OTP successfully');
    }

    if (path === '/check-email/') {
        const email = String(payload?.email ?? '').trim().toLowerCase();
        if (!email) {
            throwError({
                statusCode: 422,
                code: 'VALIDATION_ERROR',
                message: 'Validation failed',
                errors: {
                    email: ['This field is required.'],
                },
            });
        }

        if (USERS.some((user) => user.email.toLowerCase() === email)) {
            throwError({
                statusCode: 409,
                code: 'EMAIL_EXISTS',
                message: 'Email exists',
                errors: {
                    email: ['Email already exists.'],
                },
            });
        }

        return buildSuccess({exists: false}, 'Email not exists');
    }

    if (path === '/register/') {
        const email = String(payload?.email ?? '').trim().toLowerCase();
        const password = String(payload?.password ?? '');

        const validation = {
            email: !email ? ['This field is required.'] : undefined,
            password: !password ? ['This field is required.'] : undefined,
        };

        if (validation.email || validation.password) {
            throwError({
                statusCode: 422,
                code: 'VALIDATION_ERROR',
                message: 'Validation failed',
                errors: validation,
            });
        }

        if (USERS.some((user) => user.email.toLowerCase() === email)) {
            throwError({
                statusCode: 409,
                code: 'EMAIL_EXISTS',
                message: 'Email exists',
                errors: {
                    email: ['Email already exists.'],
                },
            });
        }

        const newUser = {
            id: `user-${USERS.length + 1}`,
            email,
            phone: '',
            password,
            full_name: 'New User',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        USERS.push(newUser);

        return buildSuccess(
            {
                id: newUser.id,
                email: newUser.email,
                full_name: newUser.full_name,
            },
            'Register successfully',
            201
        );
    }

    throwError({
        statusCode: 404,
        code: 'ENDPOINT_NOT_FOUND',
        message: `Fake POST route is not implemented: ${path}`,
    });
}
