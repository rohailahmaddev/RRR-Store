import app from "./app.js";
import { env } from "./config/env.js";


const PORT = env.PORT || 4000;


app.listen(PORT, () => {
   console.log(`Server is running on port http://localhost:${PORT}`);
})
