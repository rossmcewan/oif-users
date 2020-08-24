const Axios = require('axios');
const mongoose = require("mongoose");
const UserModel = require("../migration/models/User");
const legacyApi = 'https://oktank-backend.herokuapp.com/api/users/login';
let conn;

const connect = async () => {
  if (!conn) {
    conn = mongoose.createConnection(process.env.MONGODB_URI, {
      bufferCommands: false,
      bufferMaxEntries: 0,
    });
  }
  await conn;
  conn.model("User", UserModel);
};

module.exports.onUserMigration = async (event) => {
  console.log(JSON.stringify(event));
  const {userName, request:{password}} = event;
  const result = await Axios.default.post(legacyApi, { user: { email: userName, password } });
  console.log('result', JSON.stringify(result));
};

module.exports.onPostConfirmation = async (event) => {
  console.log(JSON.stringify(event));
  await connect();
  const User = conn.model('User');
  var user = new User();

//   user.username = req.body.user.username;
//   user.email = req.body.user.email;
//   await user.save();
};
