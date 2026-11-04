export function setCookie(key, value, exseconds) {
    const d = new Date();
    d.setTime(d.getTime() + (exseconds * 1000));

    let expires = "expires=" + d.toUTCString();
    document.cookie = key + "=" + value + ";" + expires + ";path=/";
}

export function removeCookie(key) {
    document.cookie = key + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/";
}

export function getCookie(key) {
    key = key + "=";
    let ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        
        if (c.indexOf(key) == 0) {
            return c.substring(key.length, c.length);
        }
    }
    return "";
}