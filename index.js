const jsonServer = require('json-server')
const server = jsonServer.create()
const router = jsonServer.router('db.json')
const middlewares = jsonServer.defaults()
const data = require("./db.json");

server.use(middlewares)
server.use(router)
server.use(jsonServer.bodyParser)
server.post("/buy-a-stock", (req,res) => {
    const {id, email, name, symbol, count, buyprice} = req.body;

    
})
server.listen(3000, () => {
  console.log('JSON Server is running')
})