import express from "express";
import { authRouter } from "./routes/auth";

const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());
app.use('/auth', authRouter);

app.get("/", (req, res) => {
  res.json({ message: "DPU UniLife backend is running" });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});