import { useEffect, useState } from "react";

export default function(url, init, deserialize_type) {
    const [data, set_data] = useState();
    
    useEffect(() => {
		async function fetch_data() {
			const response = await fetch(url, init);
			
			const deserialize = response[deserialize_type];
			let data;
			if (typeof deserialize === "function") {
				data = await deserialize.call(response);
			}

			return {response, data};
		}

		fetch_data().then(v => set_data(v));
    }, [])

    return {...data};
}