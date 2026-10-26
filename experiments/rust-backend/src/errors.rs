use axum::{extract::rejection::JsonRejection, http::StatusCode, Json};
use serde::Deserialize;
use serde_json::{json, Value};

#[derive(Deserialize)]
pub struct NewInvoice {
    pub quantity: u32,
}

// article:start rejection
pub async fn create_invoice(
    input: Result<Json<NewInvoice>, JsonRejection>,
) -> (StatusCode, Json<Value>) {
    let Json(invoice) = match input {
        Ok(value) => value,
        Err(error) => {
            let code = if error.status() == StatusCode::PAYLOAD_TOO_LARGE {
                "body_too_large"
            } else {
                "invalid_json"
            };
            return (error.status(), Json(json!({"error": {"code": code}})));
        }
    };
    if invoice.quantity == 0 {
        return (
            StatusCode::UNPROCESSABLE_ENTITY,
            Json(json!({"error": {"code": "invalid_quantity"}})),
        );
    }
    (
        StatusCode::CREATED,
        Json(json!({"quantity": invoice.quantity})),
    )
}
// article:end rejection
