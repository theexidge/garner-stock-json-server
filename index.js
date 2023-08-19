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
      event: "userbuying",
    });
    fs.writeFileSync("db.json", JSON.stringify(data, null, 2));
    res.status(200).json({ success: true, error: null });
  }
});

server.post("/squareoff", (req, res) => {
  console.log(req.body);
  const { id, type, email, sellPrice } = req.body;
  let holdingObj = null;
  let index = null;
  let balanceObj = null;
  if (type == "virtual") {
    holdingObj = data["vholdings"].find((item) => item.id === id);
    index = data["vholdings"].indexOf(holdingObj);
  } else {
    holdingObj = data["rholdings"].indexOf(
      data["rholdings"].find((item) => item.id === id)
    );
    index = data["rholdings"].indexOf(holdingObj);
  }

  if (type == "virtual") {
    balanceObj = data["virtualwallet"].find((item) => item.id === email);
    balanceObj.balance += (holdingObj.kind == "buy" ? sellPrice - holdingObj.buyprice : holdingObj.buyprice -sellPrice);
    if (index > -1) {
      data["vholdings"].splice(index, 1);
    }
  } else {
    balanceObj = data["realwallet"].find((item) => item.id === email);
    balanceObj.balance += (holdingObj.kind == "buy" ? sellPrice - holdingObj.buyprice : holdingObj.buyprice -sellPrice);
    if (index > -1) {
      data["rholdings"].splice(index, 1);
    }
  }

  data["transaction"].push({
    id: uuidv4(),
    kind: holdingObj.kind,
    symbol: holdingObj.symbol,
    name: holdingObj.name,
    count: holdingObj.count,
    buyprice: holdingObj.buyprice,
    email: holdingObj.email,
    event: "userselling",
  });
  fs.writeFileSync("db.json", JSON.stringify(data, null, 2));
  res.status(200).json({ success: true, error: null });
});
server.use(router);

server.listen(3000, () => {
  console.log("JSON Server is running");
});
