import { genkit, z } from "genkit";
import { googleAI } from "@genkit-ai/google-genai";

export const ai = genkit({ plugins: [googleAI()] });

export const fieldValidationFlow = ai.defineFlow(
  {
    name: "fieldValidationFlow",
    inputSchema: z.object({
      fieldName: z.string(),
      userInput: z.string().optional(),
    }),
    outputSchema: z.object({
      tooltip: z.string(),
      example: z.string().optional(),
    }),
  },
  async (input) => {
    console.log("\n=== GENKIT FLOW - INPUT DATA ===");
    console.log("Field Name:", input.fieldName);
    console.log("User Input:", input.userInput ?? "(empty)");
    console.log("Full Input Object:", JSON.stringify(input, null, 2));

    // Special handling for Kenyan phone numbers
    const isKenyanPhone = input.fieldName.toLowerCase().includes('kenyan') || 
                          input.fieldName.toLowerCase().includes('phone');
    
    let prompt = '';
    
    const isEmpty = !input.userInput || input.userInput.trim() === '';

//     Kenyan phone numbers can be in these formats:
// - 0712345678 (10 digits starting with 0)
// - 712345678 (9 digits without leading 0)
// - +254712345678 (international format with country code)
    
    if (isKenyanPhone) {
      prompt = `
You are validating a Kenyan phone number field. 

Field Name: ${input.fieldName}
User's Current Input: ${isEmpty ? "(empty - field is not filled)" : input.userInput}

Check online for Kenyan phone numbers validation matrix.

VALIDATE the user's input:
${isEmpty 
  ? '- The field is currently empty. Provide validation feedback on what format to use and why it\'s needed.'
  : '- If the input is valid, provide a confirmation tooltip\n- If the input is invalid or incomplete, explain what\'s wrong and how to fix it\n- Check if it\'s a valid Kenyan mobile number format (Safaricom, Airtel, or Telkom)'}

IMPORTANT: Always provide BOTH a TOOLTIP and an EXAMPLE in the exact format below.

Provide validation feedback in the following format:
TOOLTIP: [a brief, helpful tooltip - validate the input, explain the correct format, or indicate if empty]
EXAMPLE: [a valid Kenyan phone number example in the format: 0712345678]

Keep the tooltip concise but informative. Always include an example.
`;
    } else {
      prompt = `
You are validating an email field. 

Field Name: ${input.fieldName}
User's Current Input: ${isEmpty ? "(empty - field is not filled)" : input.userInput}

VALIDATE the user's input:
${isEmpty 
  ? '- The field is currently empty. Provide validation feedback on what format to use and why it\'s needed.'
  : '- If the input is valid, provide a confirmation tooltip\n- If the input is invalid or incomplete, explain what\'s wrong and how to fix it\n- Check if it follows proper email format (user@domain.com)'}

IMPORTANT: Always provide BOTH a TOOLTIP and an EXAMPLE in the exact format below.

Provide validation feedback in the following format:
TOOLTIP: [a brief, helpful tooltip - validate the input, explain the correct format, or indicate if empty]
EXAMPLE: [a valid email example like: user@example.com]

Keep the tooltip concise but informative. Always include an example.
`;
    }

    console.log("\n=== PROMPT SENT TO GEMINI ===");
    console.log(prompt);

    console.log("\n=== GEMINI REQUEST CONFIG ===");
    console.log("Model: gemini-2.5-flash");
    console.log("Request being sent to Gemini...");

    const { text } = await ai.generate({
      model: googleAI.model("gemini-2.5-flash"),
      prompt,
    });

    console.log("\n=== RAW RESPONSE FROM GEMINI ===");
    console.log("Full Response:", text);
    console.log("Response Length:", text?.length || 0, "characters");

    // Parse the response to extract tooltip and example
    let tooltip = "";
    let example = "";
    
    const tooltipMatch = text.match(/TOOLTIP:\s*(.+?)(?:\n|EXAMPLE:|$)/is);
    const exampleMatch = text.match(/EXAMPLE:\s*(.+?)(?:\n|$)/is);
    
    if (tooltipMatch) {
      tooltip = tooltipMatch[1].trim();
    } else {
      // Fallback: try to extract from the beginning until EXAMPLE
      const parts = text.split(/EXAMPLE:/i);
      tooltip = parts[0]?.replace(/TOOLTIP:/i, "").trim() || text.trim();
    }
    
    if (exampleMatch) {
      example = exampleMatch[1].trim();
    } else if (text.includes("EXAMPLE:")) {
      // Fallback: get everything after EXAMPLE:
      const parts = text.split(/EXAMPLE:/i);
      example = parts[1]?.trim() || "";
    }
    
    // Clean up any markdown formatting
    tooltip = tooltip.replace(/\*\*/g, "").replace(/`/g, "").trim();
    example = example.replace(/\*\*/g, "").replace(/`/g, "").trim();
    
    // Ensure we always have both tooltip and example
    const result = { 
      tooltip: tooltip || "Check your input.", 
      example: example || (isKenyanPhone ? "0712345678" : "user@example.com")
    };

    console.log("\n=== PARSED RESULT ===");
    console.log("Tooltip:", result.tooltip);
    console.log("Example:", result.example);
    console.log("Full Result Object:", JSON.stringify(result, null, 2));
    console.log("=== END OF FLOW ===\n");
    
    return result;
  }
);