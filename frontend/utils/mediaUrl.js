export function isHttpUrl(value) {
    return /^https?:\/\//i.test(String(value || '').trim());
}

export function resolveApiPayloadLogo(logoUri) {
    if (isHttpUrl(logoUri)) {
        return String(logoUri).trim();
    }
    return null;
}

export function getImagePickerMediaTypes(ImagePicker) {
    if (ImagePicker.MediaType?.Images) {
        return [ImagePicker.MediaType.Images];
    }
    return ['images'];
}
