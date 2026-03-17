export const executeFlowFromNode = async (
  startNode: any,
  leadId: number,
  from: string,
  nodes: any[],
  edges: any[],
  phoneId: string,
  token: string,
  botName: string,
  io: any
) => {

  if (processingLocks.has(from)) return;

  processingLocks.add(from);

  try {

    let currentNode = startNode;
    let loop = 0;

    const leadDataRes = await query(
      "SELECT variables FROM leads WHERE id=$1",
      [leadId]
    );

    let vars =
      leadDataRes.rows[0]?.variables || {};

    while (currentNode && loop < 20) {

      loop++;

      const data = currentNode.data || {};

      let payload: any = null;
      let logText = "";

      /* TEXT */

      if (
        currentNode.type === "msg_text" ||
        currentNode.type === "input"
      ) {

        const text = replaceVariables(
          data.text || "...",
          vars
        );

        payload = {
          messaging_product: "whatsapp",
          to: from,
          type: "text",
          text: { body: text }
        };

        logText = text;
      }

      /* BUTTON */

      else if (
        currentNode.type === "menu_button"
      ) {

        payload = {
          messaging_product: "whatsapp",
          to: from,
          type: "interactive",
          interactive: {
            type: "button",
            body: {
              text: data.text || "Choose"
            },
            action: {
              buttons: [1, 2, 3, 4]
                .map(i =>
                  data[`item${i}`]
                    ? {
                        type: "reply",
                        reply: {
                          id: `item${i}`,
                          title:
                            data[`item${i}`]
                              .substring(0, 20)
                        }
                      }
                    : null
                )
                .filter(Boolean)
            }
          }
        };

      }

      /* LIST */

      else if (
        currentNode.type === "menu_list"
      ) {

        const rows: any[] = [];

        for (let i = 1; i <= 10; i++) {

          if (data[`item${i}`]) {

            rows.push({
              id: `item${i}`,
              title:
                data[`item${i}`]
                  .substring(0, 24)
            });

          }

        }

        payload = {
          messaging_product: "whatsapp",
          to: from,
          type: "interactive",
          interactive: {
            type: "list",
            body: {
              text: data.text || "Choose"
            },
            action: {
              button: "Select",
              sections: [
                {
                  title: "Options",
                  rows
                }
              ]
            }
          }
        };

      }

      /* MEDIA */

      else if (
        currentNode.type === "msg_media"
      ) {

        payload = {
          messaging_product: "whatsapp",
          to: from,
          type: "image",
          image: {
            link: data.media_url
          }
        };

      }

      /* TEMPLATE */

      else if (
        currentNode.type === "send_template"
      ) {

        payload = {
          messaging_product: "whatsapp",
          to: from,
          type: "template",
          template: {
            name:
              data.templateName ||
              "default_template",
            language: {
              code:
                data.language || "en_US"
            }
          }
        };

      }

      /* DELAY */

      else if (
        currentNode.type === "delay"
      ) {

        const d =
          Number(data.delay || 1);

        await new Promise(
          r =>
            setTimeout(
              r,
              d * 1000
            )
        );

      }

      /* CONDITION */

      else if (
        currentNode.type === "condition"
      ) {

        const v =
          vars[data.variable];

        let result = false;

        if (
          data.operator === "equals"
        )
          result =
            v == data.value;

        if (
          data.operator === "contains"
        )
          result =
            v?.includes?.(
              data.value
            );

        if (
          data.operator === "exists"
        )
          result =
            v !== undefined;

        const edge =
          edges.find(
            (e: any) =>
              e.source ==
                currentNode.id &&
              e.sourceHandle ===
                (result
                  ? "true"
                  : "false")
          );

        currentNode =
          nodes.find(
            (n: any) =>
              n.id ==
              edge?.target
          );

        continue;

      }

      /* ASSIGN AGENT */

      else if (
        currentNode.type ===
        "assign_agent"
      ) {

        await query(
          "UPDATE leads SET human_active=true, bot_active=false WHERE id=$1",
          [leadId]
        );

        const text =
          data.text ||
          "Connecting to agent";

        await axios({
          method: "POST",
          url:
            `https://graph.facebook.com/v18.0/${phoneId}/messages`,
          data: {
            messaging_product:
              "whatsapp",
            to: from,
            type: "text",
            text: {
              body: text
            }
          },
          headers: {
            Authorization:
              `Bearer ${token}`
          }
        });

        break;

      }

      /* RESUME BOT */

      else if (
        currentNode.type ===
        "resume_bot"
      ) {

        await query(
          "UPDATE leads SET human_active=false, bot_active=true WHERE id=$1",
          [leadId]
        );

      }

      /* SAVE */

      else if (
        currentNode.type === "save"
      ) {

        const val =
          vars[data.variable];

        if (
          val &&
          data.leadField
        ) {

          await query(
            `UPDATE leads SET ${data.leadField}=$1 WHERE id=$2`,
            [val, leadId]
          );

        }

      }

      /* END */

      else if (
        currentNode.type === "end"
      ) {

        await query(
          "UPDATE leads SET last_node_id=NULL WHERE id=$1",
          [leadId]
        );

        break;

      }

      /* SEND */

      if (payload) {

        await axios({

          method: "POST",

          url:
            `https://graph.facebook.com/v18.0/${phoneId}/messages`,

          data: payload,

          headers: {
            Authorization:
              `Bearer ${token}`
          }

        });

      }

      await query(
        "UPDATE leads SET last_node_id=$1 WHERE id=$2",
        [currentNode.id, leadId]
      );

      /* INPUT TIMER */

      if (
        isInputNode(
          currentNode.type
        )
      ) {

        clearUserTimers(from);

        const reminderDelay =
          (data.reminderDelay || 60) * 1000;

        const timeoutDelay =
          (data.timeout || 120) * 1000;

        const reminderTimer =
          setTimeout(() => {

            axios({
              method: "POST",
              url:
                `https://graph.facebook.com/v18.0/${phoneId}/messages`,
              data: {
                messaging_product:
                  "whatsapp",
                to: from,
                type: "text",
                text: {
                  body:
                    data.reminderText ||
                    "Waiting for input"
                }
              },
              headers: {
                Authorization:
                  `Bearer ${token}`
              }
            });

            const timeoutTimer =
              setTimeout(
                async () => {

                  if (
                    data.onTimeoutNode
                  ) {

                    await query(
                      "UPDATE leads SET last_node_id=$1 WHERE id=$2",
                      [
                        data.onTimeoutNode,
                        leadId
                      ]
                    );

                  } else {

                    await query(
                      "UPDATE leads SET last_node_id=NULL WHERE id=$1",
                      [leadId]
                    );

                  }

                },
                timeoutDelay
              );

            activeTimeouts.set(
              from,
              timeoutTimer
            );

          }, reminderDelay);

        activeReminders.set(
          from,
          reminderTimer
        );

        break;

      }

      const edge =
        edges.find(
          e =>
            e.source ==
            currentNode.id
        );

      let nextNode =
        nodes.find(
          n =>
            n.id ==
            edge?.target
        );

      while (
        nextNode?.type === "goto"
      ) {

        nextNode =
          nodes.find(
            n =>
              n.id ==
              nextNode.data
                ?.targetNode
          );

      }
if (!nextNode) {

  if (data?.errorNode) {

    nextNode =
      nodes.find(
        n =>
          n.id ==
          data.errorNode
      );

    if (nextNode) {
      currentNode = nextNode;
      continue;
    }

  }

  const err =
    nodes.find(
      n =>
        n.type ===
        "error_handler"
    );

  if (err) {

    currentNode = err;
    continue;

  }

  break;

}
      currentNode = nextNode;

    }

  }

  finally {

    processingLocks.delete(
      from
    );

  }

};