const AWS = require("aws-sdk");
const bcrypt = require("bcryptjs");

// Configure AWS
AWS.config.update({ region: "us-east-1" });
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const cognito = new AWS.CognitoIdentityServiceProvider();

// Use environment variables (set these in Lambda config)
const USER_POOL_ID = process.env.USER_POOL_ID || "your-user-pool-id"; // Replace with actual ID
const CLIENT_ID = process.env.CLIENT_ID || "your-client-id"; // Replace with actual Client ID

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Password validation: Match Cognito's policy (8+ chars, upper, lower, number, special)
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

exports.handler = async (event) => {
  console.log("Event:", event);

  const { httpMethod, resource, body } = event;
  let parsedBody;
  try {
    parsedBody = body ? JSON.parse(body) : {};
  } catch (error) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Invalid JSON payload" }),
    };
  }

  // Signup
  if (resource === "/signup" && httpMethod === "POST") {
    try {
      const { email, password } = parsedBody;

      if (!email || !password) {
        return {
          statusCode: 400,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: "Email and password are required" }),
        };
      }

      if (!emailRegex.test(email)) {
        return {
          statusCode: 400,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: "Invalid email format" }),
        };
      }

      if (!passwordRegex.test(password)) {
        return {
          statusCode: 400,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: "Password must be at least 8 characters, include an uppercase, lowercase, number, and special character",
          }),
        };
      }

      const params = {
        ClientId: CLIENT_ID,
        Username: email,
        Password: password,
        UserAttributes: [{ Name: "email", Value: email }],
      };

      await cognito.signUp(params).promise();

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "User created successfully" }),
      };
    } catch (error) {
      console.error("Signup error:", error);
      return {
        statusCode: error.code === "UsernameExistsException" ? 400 : 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: error.code === "UsernameExistsException" ? "User already exists" : "Error signing up",
        }),
      };
    }
  }

  // Signin
  if (resource === "/signin" && httpMethod === "POST") {
    try {
      const { email, password } = parsedBody;

      if (!email || !password) {
        return {
          statusCode: 400,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: "Email and password are required" }),
        };
      }

      const params = {
        AuthFlow: "USER_PASSWORD_AUTH",
        ClientId: CLIENT_ID,
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password,
        },
      };

      const response = await cognito.initiateAuth(params).promise();

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: response.AuthenticationResult.IdToken }),
      };
    } catch (error) {
      console.error("Signin error:", error);
      return {
        statusCode: error.code === "NotAuthorizedException" || error.code === "UserNotFoundException" ? 400 : 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: error.code === "NotAuthorizedException" || error.code === "UserNotFoundException" ? "Invalid credentials" : "Error signing in",
        }),
      };
    }
  }

  // Create Table
  if (resource === "/tables" && httpMethod === "POST") {
    try {
      const { id, number, capacity } = parsedBody;

      if (!id || !number || !capacity) {
        return {
          statusCode: 400,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: "All fields are required" }),
        };
      }

      const params = {
        TableName: "Tables",
        Item: { id, number, capacity },
      };

      await dynamoDb.put(params).promise();

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Table created successfully" }),
      };
    } catch (error) {
      console.error("Error creating table:", error);
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Error creating table" }),
      };
    }
  }

  // Get Reservations
  if (resource === "/reservations" && httpMethod === "GET") {
    try {
      const params = {
        TableName: "Reservations",
      };

      const data = await dynamoDb.scan(params).promise();

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data.Items),
      };
    } catch (error) {
      console.error("Error fetching reservations:", error);
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Error fetching reservations" }),
      };
    }
  }

  return {
    statusCode: 404,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "Resource not found" }),
  };
};