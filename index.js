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
  } 
  else if(buyprice * count > (data["users"].find((item) => item.email === email)).maxLimit){
    res.status(401).json({ success: false, error: "Max Limit Exceeded" });
  }else {
    balanceObj.balance -= buyprice * count;
    balanceObj.invested += buyprice * count;
    balanceObj.recentstock = {
        symbol: symbol,
        buyprice: buyprice,
        count: count,
        total: buyprice * count
    };
    if(balanceObj.recentfive.length == 5){
        balanceObj.recentfive.splice(0, 1);
    }
    balanceObj.recentfive.push({
        symbol: symbol,
        buyprice: buyprice,
        id: id,
        count: count,
        total: buyprice * count
    });
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
    let transactionData = {
        id: id,
        kind: kind,
        symbol: symbol,
        name: name,
        count: count,
        buyprice: buyprice,
        email: email,
        event: "userbuying",
      };
    data["transaction"].push(transactionData);
    fs.writeFileSync("db.json", JSON.stringify(data, null, 2));
    res.status(200).json({ success: true, error: null, data: transactionData });
  }
});

server.post("/squareoff", (req, res) => {
  console.log(req.body);
  const { id, type, email, sellprice: sellprice } = req.body;
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
    balanceObj.balance += (holdingObj.kind == "buy" ? sellprice*holdingObj.count : (2*holdingObj.buyprice -sellprice)*holdingObj.count);
    balanceObj.invested -= holdingObj.buyprice * holdingObj.count;
    if (index > -1) {
      data["vholdings"].splice(index, 1);
    }
  } else {
    balanceObj = data["realwallet"].find((item) => item.id === email);
    balanceObj.balance += (holdingObj.kind == "buy" ? sellprice*holdingObj.count : (2*holdingObj.buyprice -sellprice)*holdingObj.count);
    balanceObj.invested -= holdingObj.buyprice * count;
    if (index > -1) {
      data["rholdings"].splice(index, 1);
    }
  }
  let transactionData = {
    id: uuidv4(),
    kind: holdingObj.kind,
    symbol: holdingObj.symbol,
    name: holdingObj.name,
    count: holdingObj.count,
    sellprice: sellprice,
    email: holdingObj.email,
    event: "userselling",
  };
  data["transaction"].push(transactionData);
  fs.writeFileSync("db.json", JSON.stringify(data, null, 2));
  res.status(200).json({ success: true, error: null, data: transactionData });
});

server.post("/signup", (req,res) => {
  const {email, fname, lname, age, password, role} = req.body;
  let check = data["users"].find((item) => item.email === email);
  if(check){
    res.status(401).json({success: false, error: "User Already exists"});
  }
  else{
    let userData = {
      id: email,
      fname: fname,
      email: email,
      lname: lname,
      age: age,
      password: password,
      role: role,
      parentemail: "",
      childemail: "",
      maxLimit: 99999999,
    };
    data["users"].push(userData);
    data["realwallet"].push({
      id: email,
      email: email,
      balance: 0,
      invested: 0,
      recentstock: {},
      recentfive: []
    });
    data["virtualwallet"].push({
      id: email,
      email: email,
      balance: 10000,
      invested: 0,
      recentstock: {},
      recentfive: []
    });
    fs.writeFileSync("db.json", JSON.stringify(data, null, 2));
    res.status(201).json({ success: true, error: null, data: userData });
  }
});

server.post("/login", (req,res) => {
  const {email, password} = req.body;
  let check = data["users"].find((item) => item.email === email);
  if(check){
    if(check.password == password){
      
      res.status(200).json({success: true, error: null, data: check});
    }
    else{
      res.status(400).json({ success: false, error: "Wrong Password" });
    }
  }
  else{
    res.status(400).json({ success: false, error: "User Doesn't exist" });
  }

  
});

server.patch("/setparent", (req,res) => {
  const {email, parentemail: parentemail} = req.body;
  try {
    let childObj = data["users"].find((item) => item.email === email);
    let parentObj = data["users"].find((item) => item.email === parentemail);
    childObj.parentemail = parentemail;
    parentObj.childemail = email;
  
    fs.writeFileSync("db.json", JSON.stringify(data, null, 2));
    res.status(200).json({ success: true, error: null, data: "Modified Successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: "Internal Server Error" });
    console.log(error);
  }
})
server.use(router);

server.listen(3000, () => {
  console.log("JSON Server is running");
});
