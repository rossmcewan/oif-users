const AWS = require("aws-sdk");
const cisp = new AWS.CognitoIdentityServiceProvider();
const middy = require("middy");
const {
  cors,
  httpEventNormalizer,
  httpHeaderNormalizer,
} = require("middy/middlewares");
const { USER_POOL_ID, USER_POOL_APP_CLIENT_ID } = process.env;

const _getUser = async (event) => {
  //need to investigate this
  console.log(JSON.stringify(event));
  const id = event.body.payload.id;
  const params = {
    UserPoolId: USER_POOL_ID,
    Username: id,
  };
  const result = await cisp.adminGetUser(params).promise();

  return {
    statusCode: 200,
    body: {
      user: {
        username: result.Username,
        email: result.UserAttributes["email"],
        token: "NEED TO THINK ABOUT THIS",
        bio: result.UserAttributes["profile"],
        image: result.UserAttributes["picture"],
      },
    },
  };
};

const _login = async (event) => {
  console.log(JSON.stringify(event));
  const { email, password } = event.body.user;
  const params = {
    AuthFlow: "USER_PASSWORD_AUTH",
    ClientId: USER_POOL_APP_CLIENT_ID,
    AuthParameters: {
      USERNAME: email,
      PASSWORD: password,
    },
  };
  const result = await cisp.initiateAuth(params).promise();
  return {
    statusCode: 200,
    body: {
      user: {
        username: "",
        email: email,
        token: result.AuthenticationResult.AccessToken,
        bio: "",
        image: "",
      },
    },
  };
};

const _updateUser = async (event) => {
  console.log(JSON.stringify(event));
  //can do bio and image like this
  const result = await cisp
    .adminUpdateUserAttributes({
      UserAttributes: [],
    })
    .promise();
  //if password  needs to change, can use adminSetUserPassword
  //cannot change username
};

const _register = async (event) => {
  console.log(JSON.stringify(event));
  const { username, email, password } = event.body;
  const result = await cisp
    .signUp({
      ClientId: USER_POOL_APP_CLIENT_ID,
      Password: password,
      Username: username,
      UserAttributes: [
        {
          Name: "email",
          Value: email,
        },
      ],
    })
    .promise();
  //then need to admin confirm sign up
  const confirmed = await cisp
    .adminConfirmSignUp({
      UserPoolId: USER_POOL_ID,
      Username: username,
    })
    .promise();
};

const wrap = (func) => {
  return middy(func)
    .use(cors())
    .use(httpEventNormalizer())
    .use(httpHeaderNormalizer());
};

module.exports = {
  getUser: wrap(_getUser),
  login: wrap(_login),
  updateUser: wrap(_updateUser),
  register: wrap(_register),
};
