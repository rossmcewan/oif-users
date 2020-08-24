const AWS = require("aws-sdk");
const cisp = new AWS.CognitoIdentityServiceProvider();
const middy = require("middy");
const {
  cors,
  httpEventNormalizer,
  httpHeaderNormalizer,
  jsonBodyParser,
} = require("middy/middlewares");
const { USER_POOL_ID, USER_POOL_APP_CLIENT_ID } = process.env;

const getAttribute = (attributes, name) => {
  const value = attributes.find((x) => x.Name == name);
  return value || {};
};

const _getUser = async (event) => {
  //need to investigate this
  console.log(JSON.stringify(event));

  const {
    requestContext: {
      authorizer: {
        jwt: {
          claims: { username },
        },
      },
    },
  } = event;

  const params = {
    UserPoolId: USER_POOL_ID,
    Username: username,
  };
  const result = await cisp.adminGetUser(params).promise();

  console.log("result", result);

  return {
    user: {
      username: result.Username,
      email: result.Username,
      token: "INVALID",
      bio: getAttribute(result.UserAttributes, "profile").Value,
      image: getAttribute(result.UserAttributes, "picture").Value,
    },
  };
};

const _login = async (event) => {
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
  const user = {
    user: {
      username: email,
      email: email,
      token: result.AuthenticationResult.AccessToken,
      bio: "",
      image: "",
    },
  };
  return user;
};

const _updateUser = async (event) => {
  console.log(JSON.stringify(event));
  const { username, email, bio, image, password } = event.body.user;
  const promises = [];
  const attributes = [];
  if (email) {
    attributes.push({
      Name: "email",
      Value: email,
    });
  }
  if (bio) {
    attributes.push({
      Name: "profile",
      Value: bio,
    });
  }
  if (image) {
    attributes.push({
      Name: "picture",
      Value: image,
    });
  }
  if (attributes.length) {
    promises.push(
      cisp
        .adminUpdateUserAttributes({
          UserAttributes: [],
        })
        .promise()
    );
  }
  if (password) {
    promises.push(
      cisp
        .adminSetUserPassword({
          Password: password,
          UserPoolId: USER_POOL_ID,
          Username: username,
          Permanent: true,
        })
        .promise()
    );
  }
  const results = await Promise.all(promises);
  return {
    user: {
      username,
      email,
      bio,
      image,
    },
  };
};

const _register = async (event) => {
  console.log(JSON.stringify(event));
  const { username, email, password } = event.body.user;
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
  return {
    user: {
      username,
      email: email,
      //token: result.AuthenticationResult.AccessToken,
      bio: "",
      image: "",
    },
  };
};

const wrap = (func) => {
  return middy(func)
    .use(cors())
    .use(httpEventNormalizer())
    .use(httpHeaderNormalizer())
    .use(jsonBodyParser());
};

module.exports = {
  getUser: wrap(_getUser),
  login: wrap(_login),
  updateUser: wrap(_updateUser),
  register: wrap(_register),
};
