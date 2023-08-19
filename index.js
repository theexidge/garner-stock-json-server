const jsonServer = require("json-server");
const server = jsonServer.create();
const router = jsonServer.router("db.json");
const middlewares = jsonServer.defaults();
const data = require("./db.json");
var fs = require("fs");

const { v4: uuidv4 } = require("uuid");

server.use(middlewares);
server.use(jsonServer.bodyParser);
server.post("/buystock", (req, res) => {
  console.log(req.body);
  const { email, type, buyprice, count, symbol, name, kind } = req.body;
  let balance = 0;
  let balanceObj = null;
  let id = uuidv4();
  if (type == "virtual") {
    balanceObj = data["virtualwallet"].find((item) => item.id === email);
    balance = balanceObj.balance;
  } else {
    balanceObj = data["realwallet"].find((item) => item.id === email);
    balance = balanceObj.balance;
  }
  if (balance < buyprice * count) {
    res.status(401).json({ success: false, error: "Not Enough Money" });
  } else {
    balanceObj.balance -= buyprice * count;

    if (type == "virtual") {
      data["vholdings"].push({
        id: id,
        email: email,
        name: name,
        symbol: symbol,
        count: count,
        buyprice: buyprice,
        kind: kind,
      });
    } else {
      data["rholdings"].push({
        id: id,
        email: email,
        name: name,
        symbol: symbol,
        count: count,
        buyprice: buyprice,
        kind: kind,
      });
    }

    data["transaction"].push({
      id: id,
      kind: kind,
      symbol: symbol,
      name: name,
      count: count,
      buyprice: buyprice,
      email: email,
    });
    fs.writeFileSync("db.json", JSON.stringify(data, null, 2));
    res.status(200).json({ success: true, error: null });
  }
});
server.use(router);

server.listen(3000, () => {
  console.log("JSON Server is running");
});
