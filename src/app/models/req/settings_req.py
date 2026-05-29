from pydantic import BaseModel, Field



class SettingsReq(BaseModel):
    temperature: float = Field(default=1.0, description="Temperature parameter for the model")
    reasoning_effort: str = Field(default="medium", description="Reasoning effort parameter for the model")
    supplier: str = Field(default="deepseek", description="Supplier parameter for the model")
    model_name: str = Field(default="deepseek_v4_pro", description="Model name parameter for the model")



class ModelKeyReq(BaseModel):
    api_key: str = Field(default="", description="API key parameter for the model")
    supplier:str = Field(default="", description="Supplier parameter for the model")