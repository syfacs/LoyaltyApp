import { useState } from "react";

// Keeps the values of a form.
// <input {...form.bind("name")} /> connects an input to the "name" value.
export default function useForm(initial) {
    const [values, setValues] = useState(initial);

    function set(name, value) {
        setValues((current) => ({ ...current, [name]: value }));
    }

    function bind(name) {
        return {
            name,
            value: values[name] ?? "",
            onChange: (event) => set(name, event.target.value),
        };
    }

    return { values, setValues, set, bind };
}
