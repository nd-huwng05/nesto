export const MANAGER_ID = 'manager_01';

export const HOTEL_IMAGE_PRIMARY =
    'https://pix10.agoda.net/hotelImages/124/1246280/1246280_16061017110043391702.jpg?ca=6&ce=1&s=414x232';

export const HOTEL_IMAGE_GALLERY = [
    HOTEL_IMAGE_PRIMARY,
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80',
    'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80',
];

const AMENITY_OPTIONS = [
    'Free Wifi',
    'Swimming Pool',
    'Gym / Fitness',
    'Parking Space',
    '24/7 Front Desk',
    'Restaurant',
];

const GUEST_SEGMENTS = [
    'Family',
    'Couple',
    'Beachfront',
    'Business Travelers',
    'Dorm',
    'Solo Travelers',
];

const ROOM_AMENITY_OPTIONS = [
    'Air Conditioning',
    'King Bed',
    'City View',
    'Bathtub',
    'Balcony',
    'Mini Bar',
    'Work Desk',
    'Room Service',
];

const ROOM_TYPE_IMAGES = [
    HOTEL_IMAGE_GALLERY[0],
    HOTEL_IMAGE_GALLERY[2],
    HOTEL_IMAGE_GALLERY[3],
];

const seedRoomTypes = (branchId, businessId) => [
    {
        id: `rt_${branchId}_1`,
        branchId,
        businessId,
        managerId: MANAGER_ID,
        name: 'Deluxe Room',
        basePrice: 1500000,
        capacity: 2,
        description: 'Spacious room with premium bedding and city view.',
        roomAmenities: ['Air Conditioning', 'King Bed', 'City View', 'Mini Bar'],
        images: [...ROOM_TYPE_IMAGES],
    },
    {
        id: `rt_${branchId}_2`,
        branchId,
        businessId,
        managerId: MANAGER_ID,
        name: 'Family Suite',
        basePrice: 2800000,
        capacity: 4,
        description: 'Two-bedroom suite ideal for families.',
        roomAmenities: ['Air Conditioning', 'King Bed', 'Bathtub', 'Work Desk'],
        images: [HOTEL_IMAGE_GALLERY[1], HOTEL_IMAGE_GALLERY[2]],
    },
];

const seedExtraServices = (branchId, businessId) => [
    {
        id: `es_${branchId}_1`,
        branchId,
        businessId,
        managerId: MANAGER_ID,
        name: 'Airport Transfer',
        description: 'Private pick-up and drop-off from airport.',
        price: 350000,
    },
    {
        id: `es_${branchId}_2`,
        branchId,
        businessId,
        managerId: MANAGER_ID,
        name: 'Breakfast Buffet',
        description: 'International breakfast buffet per guest.',
        price: 0,
    },
];

const seedPhysicalRooms = (branchId, businessId, roomTypeIds) => {
    const [deluxeId, familyId] = roomTypeIds;
    return [
        {
            id: `pr_${branchId}_101`,
            branchId,
            businessId,
            managerId: MANAGER_ID,
            roomNumber: '101',
            floor: '1',
            roomTypeId: deluxeId || `rt_${branchId}_1`,
        },
        {
            id: `pr_${branchId}_102`,
            branchId,
            businessId,
            managerId: MANAGER_ID,
            roomNumber: '102',
            floor: '1',
            roomTypeId: deluxeId || `rt_${branchId}_1`,
        },
        {
            id: `pr_${branchId}_201`,
            branchId,
            businessId,
            managerId: MANAGER_ID,
            roomNumber: '201',
            floor: '2',
            roomTypeId: familyId || `rt_${branchId}_2`,
        },
    ];
};

/** @type {Record<string, object>} */
let branches = {
    br1: {
        id: 'br1',
        businessId: 'b1',
        managerId: MANAGER_ID,
        name: 'Swiss Hotel',
        lodgingType: 'Hotel',
        address: '112 Lê Văn Lương, Phước Kiển, Nhà Bè, TP.HCM',
        image: HOTEL_IMAGE_PRIMARY,
        contact: {phone: '0283777888', email: 'swiss.hcm@swiss.vn'},
        amenities: ['Free Wifi', 'Swimming Pool', 'Parking Space', '24/7 Front Desk', 'Restaurant'],
        guestSegments: ['Business Travelers', 'Couple'],
        images: [...HOTEL_IMAGE_GALLERY],
        payoutAccount: {bankName: 'Vietcombank', accountNumber: '1234567890'},
        roomTypes: seedRoomTypes('br1', 'b1'),
        extraServices: seedExtraServices('br1', 'b1'),
        physicalRooms: seedPhysicalRooms('br1', 'b1', ['rt_br1_1', 'rt_br1_2']),
    },
    br2: {
        id: 'br2',
        businessId: 'b2',
        managerId: MANAGER_ID,
        name: 'Nesto Beach Front',
        lodgingType: 'Resort',
        address: '246 Trần Phú, Phường 5, Vũng Tàu',
        image: HOTEL_IMAGE_PRIMARY,
        contact: {phone: '0254123456', email: 'beach@nesto.vn'},
        amenities: ['Free Wifi', 'Swimming Pool', 'Parking Space', 'Restaurant'],
        guestSegments: ['Beachfront', 'Couple', 'Family'],
        images: [...HOTEL_IMAGE_GALLERY],
        payoutAccount: {bankName: 'Techcombank', accountNumber: '9876543210'},
        roomTypes: seedRoomTypes('br2', 'b2'),
        extraServices: [
            ...seedExtraServices('br2', 'b2'),
            {
                id: 'es_br2_3',
                branchId: 'br2',
                businessId: 'b2',
                managerId: MANAGER_ID,
                name: 'Spa Package',
                description: '90-minute aromatherapy spa session.',
                price: 890000,
            },
        ],
        physicalRooms: seedPhysicalRooms('br2', 'b2', ['rt_br2_1', 'rt_br2_2']),
    },
    br3: {
        id: 'br3',
        businessId: 'b2',
        managerId: MANAGER_ID,
        name: 'Nesto Da Lat Homestay',
        lodgingType: 'Homestay',
        address: '12 Phan Đình Phùng, Phường 2, Đà Lạt',
        image: HOTEL_IMAGE_GALLERY[1],
        contact: {phone: '0263123789', email: 'dalat@nesto.vn'},
        amenities: ['Free Wifi', 'Parking Space', '24/7 Front Desk'],
        guestSegments: ['Family', 'Solo Travelers', 'Couple'],
        images: HOTEL_IMAGE_GALLERY.slice(0, 3),
        payoutAccount: {bankName: 'ACB', accountNumber: '5555666677'},
        roomTypes: [
            {
                id: 'rt_br3_1',
                branchId: 'br3',
                businessId: 'b2',
                managerId: MANAGER_ID,
                name: 'Standard Room',
                basePrice: 650000,
                capacity: 2,
                description: 'Cozy homestay room with garden view.',
                roomAmenities: ['Air Conditioning', 'Work Desk'],
                images: [HOTEL_IMAGE_GALLERY[0], HOTEL_IMAGE_GALLERY[3]],
            },
        ],
        extraServices: seedExtraServices('br3', 'b2'),
        physicalRooms: seedPhysicalRooms('br3', 'b2', ['rt_br3_1']),
    },
};

/** @type {Record<string, object>} */
let businesses = {
    b1: {
        id: 'b1',
        managerId: MANAGER_ID,
        name: 'Swiss',
        legalName: 'Swiss Hospitality Vietnam Co., Ltd',
        taxCode: '0312456789',
        businessType: 'Hotel Chain',
        logo: 'https://png.pngtree.com/recommend-works/png-clipart/20241009/ourmid/pngtree-cool-blue-dragon-logo-png-image_14012110.png',
        legalRepresentative: 'Nguyễn Văn An',
        lodgingType: 'Hotel',
        scale: '1-5',
        contact: {
            email: 'corporate@swiss.vn',
            phone: '02838234567',
            headquartersAddress: '88 Nguyễn Đình Chiểu, Quận 1, TP.HCM',
        },
        branchIds: ['br1'],
    },
    b2: {
        id: 'b2',
        managerId: MANAGER_ID,
        name: 'Nesto Suite',
        legalName: 'Nesto Hospitality Group JSC',
        taxCode: '0309876543',
        businessType: 'Multi-brand Hospitality',
        logo: 'https://i.pinimg.com/originals/0e/e3/a4/0ee3a4fb8c3118a483cceda1d2818513.jpg',
        legalRepresentative: 'Trần Thị Bình',
        lodgingType: 'Resort',
        scale: '6-20',
        contact: {
            email: 'hello@nesto.vn',
            phone: '02839998888',
            headquartersAddress: '15 Đường số 10, Khu đô thị Him Lam, Quận 7, TP.HCM',
        },
        branchIds: ['br2', 'br3'],
    },
};

const delay = (ms = 500) => new Promise((r) => setTimeout(r, ms));

const branchSummary = (branch) => ({
    id: branch.id,
    businessId: branch.businessId,
    name: branch.name,
    address: branch.address,
    image: branch.image,
    lodgingType: branch.lodgingType,
});

const getBranchOrThrow = (branchId, managerId) => {
    const branch = branches[branchId];
    if (!branch || branch.managerId !== managerId) throw new Error('Branch not found');
    return branch;
};

const getRoomTypeName = (branch, roomTypeId) =>
    branch.roomTypes?.find((r) => r.id === roomTypeId)?.name || 'Unknown type';

export const branchMockStore = {
    AMENITY_OPTIONS,
    GUEST_SEGMENTS,
    ROOM_AMENITY_OPTIONS,

    async listBusinesses(managerId) {
        await delay(400);
        return Object.values(businesses)
            .filter((b) => b.managerId === managerId)
            .map(businessSummary);
    },

    async getBusiness(businessId, managerId) {
        await delay(400);
        const business = businesses[businessId];
        if (!business || business.managerId !== managerId) return null;
        const branchList = business.branchIds
            .map((id) => branches[id])
            .filter(Boolean)
            .map(branchSummary);
        return {...business, branchCount: branchList.length, branches: branchList};
    },

    async createBusiness(managerId, payload) {
        await delay(600);
        const id = payload.id || `b_${Date.now()}`;
        const business = {
            id,
            managerId,
            name: payload.name,
            legalName: payload.legalName || payload.name,
            taxCode: payload.taxCode || '',
            businessType: payload.businessType || payload.lodgingType || 'Hotel',
            logo: payload.logo || 'https://placehold.co/100x100/png',
            legalRepresentative: payload.legalRepresentative || '',
            lodgingType: payload.lodgingType || payload.type || 'Hotel',
            scale: payload.scale || '',
            contact: {
                email: payload.contact?.email || '',
                phone: payload.contact?.phone || payload.contactInfo?.phone || '',
                headquartersAddress: payload.contact?.headquartersAddress || '',
            },
            branchIds: [],
        };
        businesses[id] = business;
        return businessSummary(business);
    },

    async updateBusiness(businessId, managerId, updates) {
        await delay(500);
        const business = businesses[businessId];
        if (!business || business.managerId !== managerId) throw new Error('Business not found');
        businesses[businessId] = {
            ...business,
            ...updates,
            contact: {...business.contact, ...(updates.contact || {})},
        };
        return branchMockStore.getBusiness(businessId, managerId);
    },

    async deleteBusiness(businessId, managerId) {
        await delay(500);
        const business = businesses[businessId];
        if (!business || business.managerId !== managerId) throw new Error('Business not found');
        business.branchIds.forEach((brId) => delete branches[brId]);
        delete businesses[businessId];
        return {success: true};
    },

    async getBranch(branchId, managerId) {
        await delay(400);
        const branch = branches[branchId];
        if (!branch || branch.managerId !== managerId) return null;
        return {
            ...branch,
            roomTypes: branch.roomTypes || [],
            extraServices: branch.extraServices || [],
            physicalRooms: (branch.physicalRooms || []).map((pr) => ({
                ...pr,
                roomTypeName: getRoomTypeName(branch, pr.roomTypeId),
            })),
        };
    },

    async createBranch(businessId, managerId, payload) {
        await delay(600);
        const business = businesses[businessId];
        if (!business || business.managerId !== managerId) throw new Error('Business not found');
        const id = payload.id || `br_${Date.now()}`;
        const gallery = payload.images?.length ? payload.images : [payload.image].filter(Boolean);
        const branch = {
            id,
            businessId,
            managerId,
            name: payload.name,
            lodgingType: payload.lodgingType || business.lodgingType || 'Hotel',
            address: payload.address || '',
            image: gallery[0] || HOTEL_IMAGE_PRIMARY,
            contact: {
                phone: payload.phone || payload.contact?.phone || '',
                email: payload.contact?.email || '',
            },
            amenities: payload.amenities || [],
            guestSegments: payload.guestSegments || [],
            images: gallery.length ? gallery : [...HOTEL_IMAGE_GALLERY],
            payoutAccount: payload.payoutAccount || payload.billing || {},
            roomTypes: [],
            extraServices: [],
            physicalRooms: [],
        };
        branches[id] = branch;
        business.branchIds.push(id);
        return branchSummary(branch);
    },

    async updateBranch(branchId, managerId, updates) {
        await delay(500);
        const branch = getBranchOrThrow(branchId, managerId);
        const gallery = updates.images;
        branches[branchId] = {
            ...branch,
            ...updates,
            image: gallery?.length ? gallery[0] : updates.image ?? branch.image,
            images: gallery ?? updates.images ?? branch.images,
            contact: {...branch.contact, ...(updates.contact || {})},
            roomTypes: updates.roomTypes ?? branch.roomTypes,
            extraServices: updates.extraServices ?? branch.extraServices,
            physicalRooms: updates.physicalRooms ?? branch.physicalRooms,
        };
        return branchSummary(branches[branchId]);
    },

    async deleteBranch(branchId, managerId) {
        await delay(500);
        getBranchOrThrow(branchId, managerId);
        const business = businesses[branches[branchId].businessId];
        if (business) {
            business.branchIds = business.branchIds.filter((id) => id !== branchId);
        }
        delete branches[branchId];
        return {success: true};
    },

    // --- Room Types ---
    async listRoomTypes(branchId, managerId) {
        await delay(300);
        return getBranchOrThrow(branchId, managerId).roomTypes || [];
    },

    async createRoomType(branchId, managerId, payload) {
        await delay(400);
        const branch = getBranchOrThrow(branchId, managerId);
        const images = payload.images?.length ? payload.images : [];
        const roomType = {
            id: payload.id || `rt_${Date.now()}`,
            branchId,
            businessId: branch.businessId,
            managerId,
            name: payload.name,
            basePrice: Number(payload.basePrice) || 0,
            capacity: Number(payload.capacity) || 1,
            description: payload.description || '',
            roomAmenities: payload.roomAmenities || [],
            images,
        };
        branch.roomTypes = [...(branch.roomTypes || []), roomType];
        return roomType;
    },

    async updateRoomType(branchId, roomTypeId, managerId, updates) {
        await delay(400);
        const branch = getBranchOrThrow(branchId, managerId);
        const index = (branch.roomTypes || []).findIndex((r) => r.id === roomTypeId);
        if (index === -1) throw new Error('Room type not found');
        branch.roomTypes[index] = {
            ...branch.roomTypes[index],
            ...updates,
            basePrice:
                updates.basePrice !== undefined
                    ? Number(updates.basePrice)
                    : branch.roomTypes[index].basePrice,
            capacity:
                updates.capacity !== undefined
                    ? Number(updates.capacity)
                    : branch.roomTypes[index].capacity,
            roomAmenities: updates.roomAmenities ?? branch.roomTypes[index].roomAmenities,
            images: updates.images ?? branch.roomTypes[index].images,
        };
        return branch.roomTypes[index];
    },

    async deleteRoomType(branchId, roomTypeId, managerId) {
        await delay(400);
        const branch = getBranchOrThrow(branchId, managerId);
        const inUse = (branch.physicalRooms || []).some((pr) => pr.roomTypeId === roomTypeId);
        if (inUse) {
            throw new Error('Cannot delete: physical rooms are assigned to this room type.');
        }
        branch.roomTypes = (branch.roomTypes || []).filter((r) => r.id !== roomTypeId);
        return {success: true};
    },

    // --- Extra Services ---
    async listExtraServices(branchId, managerId) {
        await delay(300);
        return getBranchOrThrow(branchId, managerId).extraServices || [];
    },

    async createExtraService(branchId, managerId, payload) {
        await delay(400);
        const branch = getBranchOrThrow(branchId, managerId);
        const service = {
            id: payload.id || `es_${Date.now()}`,
            branchId,
            businessId: branch.businessId,
            managerId,
            name: payload.name,
            description: payload.description || '',
            price: Number(payload.price) || 0,
        };
        branch.extraServices = [...(branch.extraServices || []), service];
        return service;
    },

    async updateExtraService(branchId, serviceId, managerId, updates) {
        await delay(400);
        const branch = getBranchOrThrow(branchId, managerId);
        const index = (branch.extraServices || []).findIndex((s) => s.id === serviceId);
        if (index === -1) throw new Error('Extra service not found');
        branch.extraServices[index] = {
            ...branch.extraServices[index],
            ...updates,
            price:
                updates.price !== undefined
                    ? Number(updates.price)
                    : branch.extraServices[index].price,
        };
        return branch.extraServices[index];
    },

    async deleteExtraService(branchId, serviceId, managerId) {
        await delay(400);
        const branch = getBranchOrThrow(branchId, managerId);
        branch.extraServices = (branch.extraServices || []).filter((s) => s.id !== serviceId);
        return {success: true};
    },

    // --- Physical Rooms ---
    async listPhysicalRooms(branchId, managerId) {
        await delay(300);
        const branch = getBranchOrThrow(branchId, managerId);
        return (branch.physicalRooms || []).map((pr) => ({
            ...pr,
            roomTypeName: getRoomTypeName(branch, pr.roomTypeId),
        }));
    },

    async createPhysicalRoom(branchId, managerId, payload) {
        await delay(400);
        const branch = getBranchOrThrow(branchId, managerId);
        const duplicate = (branch.physicalRooms || []).some(
            (pr) => pr.roomNumber === payload.roomNumber && pr.floor === payload.floor
        );
        if (duplicate) throw new Error('A room with this number already exists on this floor.');
        const room = {
            id: payload.id || `pr_${Date.now()}`,
            branchId,
            businessId: branch.businessId,
            managerId,
            roomNumber: payload.roomNumber,
            floor: payload.floor,
            roomTypeId: payload.roomTypeId,
        };
        branch.physicalRooms = [...(branch.physicalRooms || []), room];
        return {...room, roomTypeName: getRoomTypeName(branch, room.roomTypeId)};
    },

    async updatePhysicalRoom(branchId, physicalRoomId, managerId, updates) {
        await delay(400);
        const branch = getBranchOrThrow(branchId, managerId);
        const index = (branch.physicalRooms || []).findIndex((r) => r.id === physicalRoomId);
        if (index === -1) throw new Error('Physical room not found');
        branch.physicalRooms[index] = {...branch.physicalRooms[index], ...updates};
        const room = branch.physicalRooms[index];
        return {...room, roomTypeName: getRoomTypeName(branch, room.roomTypeId)};
    },

    async deletePhysicalRoom(branchId, physicalRoomId, managerId) {
        await delay(400);
        const branch = getBranchOrThrow(branchId, managerId);
        branch.physicalRooms = (branch.physicalRooms || []).filter((r) => r.id !== physicalRoomId);
        return {success: true};
    },
};

function businessSummary(business) {
    return {
        id: business.id,
        managerId: business.managerId,
        name: business.name,
        logo: business.logo,
        branches: business.branchIds
            .map((id) => branches[id])
            .filter(Boolean)
            .map(branchSummary),
    };
}
