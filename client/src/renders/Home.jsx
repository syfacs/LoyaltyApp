import { useEffect, useState } from "react";
import {AUR, HTTP_CLIENT} from "../services/api.js"

const http_client = new HTTP_CLIENT(AUR);
http_client.set_path("server");

function Home() {
    const [count, setCount] = useState(0)
    const {response, data} = http_client.useFetch("/GetObject/5", null, "json");

    console.log(response, data)

    return (
        <>
            <button onClick={() => setCount(count+1)}>Click: {count}</button>
        </>
    )
}

export default Home;