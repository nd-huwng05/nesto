import { uploadCloudinaryImage } from '../services/MediaService';
import { API_ROOT_URL } from './apiConfig';

export function isHttpUrl(value) {
    return /^https?:\/\//i.test(String(value || '').trim());
}

export function resolveMediaUrl(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (isHttpUrl(raw)) return raw;
    const base = String(API_ROOT_URL || '').replace(/\/+$/, '');
    if (!base) return raw;
    return `${base}${raw.startsWith('/') ? raw : `/${raw}`}`;
}

export function resolveApiPayloadLogo(logoUri) {
    if (isHttpUrl(logoUri)) {
        return String(logoUri).trim();
    }
    return null;
}

export async function resolveMediaForApi(localUri, folder = 'nesto/business') {
    const raw = String(localUri || '').trim();
    if (!raw) return null;
    if (isHttpUrl(raw)) return raw;
    const uploaded = await uploadCloudinaryImage(raw, { folder });
    return uploaded.status === 'success' ? uploaded.url : null;
}

export async function resolveMediaListForApi(uris, folder = 'nesto/business') {
    const output = [];
    for (const uri of uris || []) {
        const url = await resolveMediaForApi(uri, folder);
        if (url) output.push(url);
    }
    return output;
}

export function getImagePickerMediaTypes(ImagePicker) {
    if (ImagePicker.MediaType?.Images) {
        return [ImagePicker.MediaType.Images];
    }
    return ['images'];
}
