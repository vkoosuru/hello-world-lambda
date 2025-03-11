const AWS = require("aws-sdk");
const bcrypt = require("bcryptjs");

// Configure AWS
AWS.config.update({ region: "us-east-1" });
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const cognito = new AWS.CognitoIdentityServiceProvider();

const USER_POOL_ID = "your-user-pool-id";
const CLIENT_ID = "your-client-id";

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Password validation: At least 12 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/;

// Signup Function
exports.signup = async (event) => {
  try {
    const body = JSON.parse(event.body);

    // Validate input
    if (!body.email || !body.password) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Email and password are required" })
      };
    }

    if (!emailRegex.test(body.email)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Invalid email format" })
      };
    }

    if (!passwordRegex.test(body.password)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Password must be at least 12 characters, include an uppercase, lowercase, number, and special character"
        })
      };
    }

    const params = {
      ClientId: CLIENT_ID,
      Username: body.email,
      Password: body.password,
      UserAttributes: [{ Name: "email", Value: body.email }]
    };

    await cognito.signUp(params).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "User created successfully" })
    };
  } catch (error) {
    console.error("Signup error:", error);
    return {
      statusCode: error.code === "UsernameExistsException" ? 400 : 500,
      body: JSON.stringify({
        message: error.code === "UsernameExistsException" ? "User already exists" : "Error signing up"
      })
    };
  }
};

// Signin Function
exports.signin = async (event) => {
  try {
    const body = JSON.parse(event.body);

    if (!body.email || !body.password) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Email and password are required" })
      };
    }

    const params = {
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: CLIENT_ID,
      AuthParameters: {
        USERNAME: body.email,
        PASSWORD: body.password
      }
    };

    const response = await cognito.initiateAuth(params).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({ token: response.AuthenticationResult.IdToken })
    };
  } catch (error) {
    console.error("Signin error:", error);
    return {
      statusCode: error.code === "NotAuthorizedException" || error.code === "UserNotFoundException" ? 400 : 500,
      body: JSON.stringify({
        message: error.code === "NotAuthorizedException" || error.code === "UserNotFoundException" ? "Invalid credentials" : "Error signing in"
      })
    };
  }
};

// Create Table Entry
exports.createTable = async (event) => {
  try {
    const body = JSON.parse(event.body);

    if (!body.id || !body.number || !body.capacity) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "All fields are required" })
      };
    }

    const params = {
      TableName: "Tables",
      Item: {
        id: body.id,
        number: body.number,
        capacity: body.capacity
      }
    };

    await dynamoDb.put(params).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Table created successfully" })
    };
  } catch (error) {
    console.error("Error creating table:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error creating table" })
    };
  }
};

// Fetch Reservations
exports.getReservations = async () => {
  try {
    const params = {
      TableName: "Reservations"
    };

    const data = await dynamoDb.scan(params).promise();

    return {
      statusCode: 200,
      body: JSON.stringify(data.Items)
    };
  } catch (error) {
    console.error("Error fetching reservations:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error fetching reservations" })
    };
  }
};
