package com.task03;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.syndicate.deployment.annotations.lambda.LambdaHandler;
import com.syndicate.deployment.model.RetentionSetting;

import java.util.HashMap;
import java.util.Map;

@LambdaHandler(
		lambdaName = "hello_world",
		roleName = "hello_world-role",
		isPublishVersion = true,
		aliasName = "learn",
		logsExpiration = RetentionSetting.SYNDICATE_ALIASES_SPECIFIED
)
public class HelloWorld implements RequestHandler<Object, Map<String, Object>> {

	@Override
	public Map<String, Object> handleRequest(Object request, Context context) {
		// Log a message
		System.out.println("Hello from lambda");

		// Create the response map
		Map<String, Object> resultMap = new HashMap<>();

		// Set the status code
		resultMap.put("statusCode", 200);

		// Set the message directly in the resultMap
		resultMap.put("message", "Hello from Lambda");

		return resultMap;
	}
}