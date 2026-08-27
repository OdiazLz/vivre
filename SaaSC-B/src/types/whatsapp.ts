export interface WhatsAppButtonOption {
    id: string;
    title: string;
}

export interface InteractiveButtonPayload {
    messagin_product: string;
    recipient_type: string;
    to: string;
    type: string;
    interactive: {
        type: string;
        body: { text: string };
        footer?: { text: string };
        action: {
            buttons: Array<{
                type: string;
                reply: {
                    id: string;
                    title: string;
                }
            }>;
        }
    }
}