import { getStateByConversationId } from "../repositories/stateRepo";
import { query } from "../adapters/dbAdapter";
import { ConversationState } from "./stateTypes";

export const loadState = async (
  conversationId: string
): Promise<ConversationState> => {

  let state = await getStateByConversationId(
    conversationId
  );

  if (!state) {
    const newState: ConversationState = {
      conversation_id: conversationId,
      current_node_id: null,
      variables: {},
      waiting_input: false,
      waiting_agent: false,
      input_variable: null
    };

    await query(
      `
      INSERT INTO conversation_state
      (conversation_id, current_node_id, variables, waiting_input, waiting_agent, input_variable)
      VALUES ($1,$2,$3,$4,$5,$6)
      `,
      [
        newState.conversation_id,
        newState.current_node_id,
        JSON.stringify(newState.variables),
        newState.waiting_input,
        newState.waiting_agent,
        newState.input_variable
      ]
    );

    return newState;
  }

  return {
    ...state,
    variables: state.variables || {}
  };
};

export const saveState = async (
  state: ConversationState
) => {

  await query(
    `
    UPDATE conversation_state
    SET
      current_node_id = $1,
      variables = $2,
      waiting_input = $3,
      waiting_agent = $4,
      input_variable = $5
    WHERE conversation_id = $6
    `,
    [
      state.current_node_id,
      JSON.stringify(state.variables),
      state.waiting_input,
      state.waiting_agent,
      state.input_variable,
      state.conversation_id
    ]
  );

};