const Axios = require("axios");
const mongoose = require("mongoose");
const UserModel = require("../migration/models/User");
const legacyApi = `${process.env.LEGACY_API}/users/login`;
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
  console.log(event);
  const {
    userName,
    request: { password },
  } = event;
  const result = await Axios.default.post(legacyApi, {
    user: { email: userName, password },
  });
  const { user } = result.data;
  console.log('user', user);
  if (user) {
    event.response.userAttributes = {
      email: user.email,
      picture: user.image,
      profile: user.bio,
    };
    event.response.finalUserStatus = "CONFIRMED";
    event.response.messageAction = "SUPPRESS";
    return event;
  }
};

module.exports.onPostConfirmation = async (event) => {
  console.log(JSON.stringify(event));
  await connect();
  const User = conn.model("User");
  var user = new User();

  //   user.username = req.body.user.username;
  //   user.email = req.body.user.email;
  //   await user.save();
};
