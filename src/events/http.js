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

  return {
    user: {
      username: getAttribute(result.UserAttributes, "name").Value,
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
  const authResult = await cisp.initiateAuth(params).promise();
  const getUserParams = {
    UserPoolId: USER_POOL_ID,
    Username: email,
  };
  const userResult = await cisp.adminGetUser(getUserParams).promise();
  const user = {
    user: {
      username: getAttribute(userResult.UserAttributes, "name").Value,
      email: email,
      token: authResult.AuthenticationResult.AccessToken,
      bio: getAttribute(userResult.UserAttributes, "profile").Value,
      image: getAttribute(userResult.UserAttributes, "picture").Value,
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
  if (username) {
    attributes.push({
      Name: "name",
      Value: username,
    });
  }
  if (attributes.length) {
    promises.push(
      cisp
        .adminUpdateUserAttributes({
          UserPoolId: USER_POOL_ID,
          Username: email,
          UserAttributes: attributes,
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
  const getUserParams = {
    UserPoolId: USER_POOL_ID,
    Username: email,
  };
  const userResult = await cisp.adminGetUser(getUserParams).promise();
  const user = {
    user: {
      username: getAttribute(userResult.UserAttributes, "name").Value,
      email: email,
      bio: getAttribute(userResult.UserAttributes, "profile").Value,
      image: getAttribute(userResult.UserAttributes, "picture").Value,
    },
  };
  return user;
};

const _register = async (event) => {
  const { username, email, password } = event.body.user;
  const result = await cisp
    .signUp({
      ClientId: USER_POOL_APP_CLIENT_ID,
      Password: password,
      Username: email,
      UserAttributes: [
        {
          Name: "email",
          Value: email,
        },
        {
          Name: "name",
          Value: username,
        },
      ],
    })
    .promise();
  //then need to admin confirm sign up
  const confirmed = await cisp
    .adminConfirmSignUp({
      UserPoolId: USER_POOL_ID,
      Username: email,
    })
    .promise();

  return await _login({
    body: {
      user: {
        email,
        password,
      },
    },
  });
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
