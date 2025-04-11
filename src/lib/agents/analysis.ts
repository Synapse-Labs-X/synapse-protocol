import { AgentSelectionResult } from "@/types/agent";

/**
 * Interface for a simple rule-based matcher
 */
/**
interface KeywordRule {
  keywords: string[];
  agentId: string;
  reason: string;
}
*/

/**
 * Analyzes user prompts to determine which agents should handle the task
 */
export async function analyzePrompt(
  promptText: string,
): Promise<AgentSelectionResult> {
  // For demo purposes, we'll use a simple keyword-based approach
  // In a real implementation, this could use a more sophisticated NLP model
  const promptLower = promptText.toLowerCase();
  const selectedAgents: string[] = [];
  const reasoning: Record<string, string> = {};

  // Image-related tasks
  if (
    promptLower.includes("image") ||
    promptLower.includes("picture") ||
    promptLower.includes("visualization") ||
    promptLower.includes("visual") ||
    promptLower.includes("diagram") ||
    promptLower.includes("draw") ||
    promptLower.includes("generate image")
  ) {
    selectedAgents.push("image-gen-1");
    reasoning["image-gen-1"] =
      "Prompt contains request for visual content or imagery";
  }

  // Data analysis tasks
  if (
    promptLower.includes("data") ||
    promptLower.includes("analyze") ||
    promptLower.includes("statistics") ||
    promptLower.includes("chart") ||
    promptLower.includes("graph") ||
    promptLower.includes("metrics") ||
    promptLower.includes("numbers")
  ) {
    selectedAgents.push("data-analyzer");
    reasoning["data-analyzer"] = "Prompt requires data analysis or processing";
  }

  // Research tasks
  if (
    promptLower.includes("research") ||
    promptLower.includes("find") ||
    promptLower.includes("search") ||
    promptLower.includes("information") ||
    promptLower.includes("lookup") ||
    promptLower.includes("discover") ||
    promptLower.includes("article")
  ) {
    selectedAgents.push("research-assistant");
    reasoning["research-assistant"] =
      "Prompt requires information gathering or research";
  }

  // Code generation tasks
  if (
    promptLower.includes("code") ||
    promptLower.includes("program") ||
    promptLower.includes("develop") ||
    promptLower.includes("function") ||
    promptLower.includes("script") ||
    promptLower.includes("api") ||
    promptLower.includes("software")
  ) {
    selectedAgents.push("code-generator");
    reasoning["code-generator"] =
      "Prompt requires code generation or programming assistance";
  }

  // Translation tasks
  if (
    promptLower.includes("translate") ||
    promptLower.includes("language") ||
    promptLower.includes("spanish") ||
    promptLower.includes("french") ||
    promptLower.includes("german") ||
    promptLower.includes("japanese") ||
    promptLower.includes("chinese") ||
    promptLower.includes("conversion")
  ) {
    selectedAgents.push("translator");
    reasoning["translator"] =
      "Prompt requires language translation or conversion";
  }

  // Summarization tasks
  if (
    promptLower.includes("summarize") ||
    promptLower.includes("summary") ||
    promptLower.includes("brief") ||
    promptLower.includes("condense") ||
    promptLower.includes("shorten") ||
    promptLower.includes("tldr") ||
    promptLower.includes("overview")
  ) {
    selectedAgents.push("summarizer");
    reasoning["summarizer"] =
      "Prompt requests content summarization or overview";
  }

  // Text generation (fallback if no specific agent is selected)
  if (
    selectedAgents.length === 0 ||
    promptLower.includes("write") ||
    promptLower.includes("text") ||
    promptLower.includes("content") ||
    promptLower.includes("generate") ||
    promptLower.includes("create")
  ) {
    selectedAgents.push("text-gen-1");
    reasoning["text-gen-1"] =
      "Prompt requires general text generation or content creation";
  }

  // Simulate API request delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Calculate estimated cost based on selected agents
  const agentCosts: Record<string, number> = {
    "main-agent": 0,
    "text-gen-1": 5,
    "image-gen-1": 10,
    "data-analyzer": 7,
    "research-assistant": 8,
    "code-generator": 6,
    translator: 4,
    summarizer: 3,
  };

  const estimatedCost = selectedAgents.reduce(
    (sum, agentId) => sum + (agentCosts[agentId] || 0),
    0,
  );

  return {
    selectedAgents,
    reasoning,
    estimatedCost,
  };
}
