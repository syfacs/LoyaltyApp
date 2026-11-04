// Client side checks. The server checks everything again, so these are only here to give quick feedback.
// Every function returns an error message, or "" when the value is fine.

import { MAX_IMAGE_MB, PASSWORD_MIN_LENGTH, STAFF_PIN_LENGTH } from "../constants.js";

export function cleanPhone(value) {
    return String(value ?? "").replace(/[\s-]/g, "");
}

export function checkRequired(value, label) {
    return String(value ?? "").trim() ? "" : `${label} is required.`;
}

// The phone fields show "+60" in front, so the person types the number WITHOUT the leading 0:
// 12-345-6789 (9 digits), or 11-1234-5678 (10 digits) for the 011 / 015 numbers.
export function checkPhone(value) {
    return /^[1-9]\d{8,9}$/.test(cleanPhone(value))
        ? ""
        : "Enter 9 or 10 digits after +60, without the leading 0 (e.g. 12-345 6789).";
}

// the number the server and the remote API expect, with the leading 0 put back: "12-345 6789" becomes "0123456789"
export function fullPhone(value) {
    return `0${cleanPhone(value)}`;
}

// "+60123456789" (as the server shows it) becomes "123456789", for filling the phone field
export function localPhone(value) {
    return String(value ?? "").replace(/^\+60?/, "").replace(/^0/, "");
}

export function checkEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value ?? "").trim())
        ? ""
        : "Please enter a valid email address.";
}

export function checkPassword(value) {
    const text = String(value ?? "");

    if (text.length < PASSWORD_MIN_LENGTH) return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
    if (!/[A-Za-z]/.test(text) || !/\d/.test(text)) return "Password must contain a letter and a number.";

    return "";
}

export function checkMatch(value, other) {
    return value === other ? "" : "Passwords do not match.";
}

export function checkPin(value) {
    return new RegExp(`^\\d{${STAFF_PIN_LENGTH}}$`).test(String(value ?? ""))
        ? ""
        : `Staff PIN must be ${STAFF_PIN_LENGTH} digits.`;
}

export function checkImage(file) {
    if (!file) return "";

    if (!file.type.startsWith("image/")) return "Please choose an image file.";
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) return `Image must be smaller than ${MAX_IMAGE_MB} MB.`;

    return "";
}

export function checkDates(start, end) {
    if (!start) return "Please choose a start date.";
    if (!end) return "Please choose an end date.";

    return end < start ? "The end date cannot be earlier than the start date." : "";
}

// takes an object like { name: "...", phone: "..." } and drops the fields that have no error
export function onlyErrors(errors) {
    return Object.fromEntries(Object.entries(errors).filter(([, message]) => message));
}
