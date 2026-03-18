import express from 'express';

const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());

app.get('/', (req, res) => {
    res.send('ดีจ้า');
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});