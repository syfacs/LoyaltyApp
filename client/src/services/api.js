import useFetch from "./useFetch.js"

class API_URL_REGISTRY {
    constructor(base={}) {
        this.urls = {};

        Object.entries(base).forEach(([k, v]) => {
            this.register_url(k, v);
        });
    }

    get_url(key) {
        return this.urls[key];
    }

    register_url(key, url) {
        if (typeof url !== "string") throw new Error("url must be a string");
        this.urls[key] = url.replace(/\/+$/, "");
    }

    path(key, path) {
        const url = this.get_url(key);
        if (!url) return;

        return url + path;
    }
}

export class HTTP_CLIENT {
    constructor(registry) {
        this.registry = registry;
    }

    set_path(key) {
        if (!this.registry.get_url(key)) throw new Error(`invalid path for ${key}`);
        this.path = key;
    }

    useFetch(url, init, dt) {
        return useFetch(this.registry.path(this.path, url), init, dt);
    }
}

export const AUR = new API_URL_REGISTRY({
    remote: "https://alpacaapi.xcode.com.my/api",
    base: "http://localhost:5218/api",
    test: "https://studentapp.xcode.com.my/api",
});