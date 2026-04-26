"""
FastAPI Main Application
Anomaly Detection Web Service
"""

from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
from pathlib import Path
import json

# Local imports
import sys
sys.path.append('/home/claude/anomaly-detection-webapp/backend/app')
from anomaly_detector import AnomalyDetector, EnsembleDetector
from processor import CSVProcessor, GoogleSheetsConnector, DataWarehouse, DataValidator
# Initialize FastAPI app
app = FastAPI(
    title="Anomaly Detection API",
    description="Real-time financial transaction anomaly detection using Machine Learning",
    version="1.0.0"
)

# CORS middleware for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global instances
csv_processor = CSVProcessor()
data_warehouse = DataWarehouse()
current_model: Optional[AnomalyDetector] = None
model_trained = False

# Pydantic models for API
class TransactionUploadResponse(BaseModel):
    success: bool
    message: str
    metadata: Dict[str, Any]
    row_count: int

class AnalysisRequest(BaseModel):
    use_ensemble: bool = False
    contamination: float = Field(default=0.1, ge=0.01, le=0.5)

class AnalysisResponse(BaseModel):
    success: bool
    total_transactions: int
    anomalies_detected: int
    risk_distribution: Dict[str, int]
    average_risk_score: float
    processing_time: float

class TransactionResult(BaseModel):
    transaction_id: str
    amount: float
    timestamp: str
    risk_score: float
    risk_level: str
    is_anomaly: bool
    confidence: float
    user_id: Optional[str]

class ExplanationResponse(BaseModel):
    transaction_id: str
    risk_score: float
    risk_level: str
    confidence: float
    is_anomaly: bool
    top_reasons: List[str]
    unusual_features: Dict[str, Any]

class GoogleSheetsRequest(BaseModel):
    spreadsheet_url: str
    worksheet_name: str = "Sheet1"
    credentials_path: Optional[str] = None

class StatisticsResponse(BaseModel):
    total_transactions: int
    unique_users: int
    date_range: Dict[str, str]
    amount_stats: Dict[str, float]
    last_updated: str
    risk_summary: Dict[str, int]


# API Endpoints

@app.get("/")
async def root():
    """API health check"""
    return {
        "service": "Anomaly Detection API",
        "status": "online",
        "version": "1.0.0",
        "model_trained": model_trained
    }

@app.post("/upload/csv", response_model=TransactionUploadResponse)
async def upload_csv(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None
):
    """
    Upload CSV file with transaction data
    
    Required columns: amount, timestamp
    Optional columns: user_id, merchant_category, location, device_type
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    try:
        # Read file content
        content = await file.read()
        
        # Process CSV
        df, metadata = await csv_processor.process_csv(content, file.filename)
        
        # Store in data warehouse
        data_warehouse.store_transactions(df, source="csv_upload")
        
        return TransactionUploadResponse(
            success=True,
            message=f"Successfully uploaded {len(df)} transactions",
            metadata=metadata,
            row_count=len(df)
        )
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@app.post("/train", response_model=Dict[str, Any])
async def train_model(request: AnalysisRequest):
    """
    Train anomaly detection model on available data
    """
    global current_model, model_trained
    
    try:
        # Get all transactions from warehouse
        df = data_warehouse.get_transactions()
        
        if len(df) < 10:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient data for training. Need at least 10 transactions, found {len(df)}"
            )
        
        # Initialize model
        if request.use_ensemble:
            current_model = EnsembleDetector(contamination=request.contamination)
        else:
            current_model = AnomalyDetector(
                model_type='isolation_forest',
                contamination=request.contamination
            )
        
        # Train model
        start_time = datetime.now()
        current_model.train(df)
        training_time = (datetime.now() - start_time).total_seconds()
        
        model_trained = True
        
        # Save model
        model_path = Path("/home/claude/anomaly-detection-webapp/data/models")
        model_path.mkdir(parents=True, exist_ok=True)
        
        model_file = model_path / f"model_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pkl"
        if hasattr(current_model, 'models'):
            # Ensemble - save first model
            current_model.models[0].save(str(model_file))
        else:
            current_model.save(str(model_file))
        
        return {
            "success": True,
            "message": "Model trained successfully",
            "model_type": "ensemble" if request.use_ensemble else "isolation_forest",
            "training_samples": len(df),
            "training_time_seconds": training_time,
            "contamination": request.contamination,
            "model_path": str(model_file)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")

@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_transactions():
    """
    Analyze all transactions and detect anomalies
    """
    global current_model, model_trained
    
    if not model_trained or current_model is None:
        raise HTTPException(
            status_code=400,
            detail="Model not trained. Call /train endpoint first"
        )
    
    try:
        # Get all transactions
        df = data_warehouse.get_transactions()
        
        if len(df) == 0:
            raise HTTPException(status_code=400, detail="No transactions to analyze")
        
        # Run predictions
        start_time = datetime.now()
        results = current_model.predict(df)
        processing_time = (datetime.now() - start_time).total_seconds()
        
        # Calculate statistics
        risk_distribution = {
            'Low': int((results['risk_levels'] == 'Low').sum()),
            'Medium': int((results['risk_levels'] == 'Medium').sum()),
            'High': int((results['risk_levels'] == 'High').sum()),
            'Critical': int((results['risk_levels'] == 'Critical').sum())
        }
        
        return AnalysisResponse(
            success=True,
            total_transactions=len(df),
            anomalies_detected=int(results['is_anomaly'].sum()),
            risk_distribution=risk_distribution,
            average_risk_score=float(results['risk_scores'].mean()),
            processing_time=processing_time
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.get("/transactions", response_model=List[TransactionResult])
async def get_transactions(
    limit: int = 100,
    risk_level: Optional[str] = None,
    user_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """
    Get transactions with optional filtering
    
    Parameters:
    - limit: Maximum number of transactions to return
    - risk_level: Filter by risk level (Low, Medium, High, Critical)
    - user_id: Filter by user ID
    - start_date: Filter from date (ISO format)
    - end_date: Filter to date (ISO format)
    """
    if not model_trained or current_model is None:
        raise HTTPException(
            status_code=400,
            detail="Model not trained. Call /train endpoint first"
        )
    
    try:
        # Parse dates
        start_dt = datetime.fromisoformat(start_date) if start_date else None
        end_dt = datetime.fromisoformat(end_date) if end_date else None
        
        # Get filtered transactions
        df = data_warehouse.get_transactions(
            start_date=start_dt,
            end_date=end_dt,
            user_id=user_id,
            limit=limit
        )
        
        if len(df) == 0:
            return []
        
        # Run predictions
        results = current_model.predict(df)
        
        # Build response
        transactions = []
        for idx in range(len(df)):
            # Apply risk level filter if specified
            if risk_level and results['risk_levels'][idx] != risk_level:
                continue
            
            transactions.append(TransactionResult(
                transaction_id=df.iloc[idx]['transaction_id'],
                amount=float(df.iloc[idx]['amount']),
                timestamp=df.iloc[idx]['timestamp'].isoformat(),
                risk_score=float(results['risk_scores'][idx]),
                risk_level=results['risk_levels'][idx],
                is_anomaly=bool(results['is_anomaly'][idx]),
                confidence=float(results['confidence'][idx]),
                user_id=df.iloc[idx].get('user_id')
            ))
        
        return transactions
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")

@app.get("/transactions/{transaction_id}/explain", response_model=ExplanationResponse)
async def explain_transaction(transaction_id: str):
    """
    Get detailed explanation for why a transaction was flagged
    """
    if not model_trained or current_model is None:
        raise HTTPException(
            status_code=400,
            detail="Model not trained. Call /train endpoint first"
        )
    
    try:
        # Get all transactions and find the one we want
        df = data_warehouse.get_transactions()
        
        matching_rows = df[df['transaction_id'] == transaction_id]
        if len(matching_rows) == 0:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        # Get index of transaction
        idx = matching_rows.index[0]
        
        # Get explanation (only works with single models, not ensemble)
        if hasattr(current_model, 'models'):
            model = current_model.models[0]
        else:
            model = current_model
        
        explanation = model.explain_prediction(df, idx)
        
        return ExplanationResponse(
            transaction_id=transaction_id,
            risk_score=explanation['risk_score'],
            risk_level=explanation['risk_level'],
            confidence=explanation['confidence'],
            is_anomaly=explanation['is_anomaly'],
            top_reasons=explanation['top_reasons'],
            unusual_features=explanation['unusual_features']
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Explanation failed: {str(e)}")

@app.get("/statistics", response_model=StatisticsResponse)
async def get_statistics():
    """
    Get overall statistics and analytics
    """
    try:
        # Get warehouse stats
        stats = data_warehouse.get_statistics()
        
        if not stats:
            raise HTTPException(status_code=404, detail="No data available")
        
        # Get risk distribution if model is trained
        risk_summary = {'Low': 0, 'Medium': 0, 'High': 0, 'Critical': 0}
        
        if model_trained and current_model is not None:
            df = data_warehouse.get_transactions(limit=1000)
            if len(df) > 0:
                results = current_model.predict(df)
                risk_summary = {
                    'Low': int((results['risk_levels'] == 'Low').sum()),
                    'Medium': int((results['risk_levels'] == 'Medium').sum()),
                    'High': int((results['risk_levels'] == 'High').sum()),
                    'Critical': int((results['risk_levels'] == 'Critical').sum())
                }
        
        return StatisticsResponse(
            total_transactions=stats['total_transactions'],
            unique_users=stats['unique_users'],
            date_range=stats['date_range'],
            amount_stats=stats['amount_stats'],
            last_updated=stats['last_updated'],
            risk_summary=risk_summary
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Statistics fetch failed: {str(e)}")

@app.post("/google-sheets/connect")
async def connect_google_sheets(request: GoogleSheetsRequest):
    """
    Connect to Google Sheets for live data ingestion
    
    Note: Requires service account credentials to be configured
    """
    try:
        connector = GoogleSheetsConnector(credentials_path=request.credentials_path)
        connector.connect(request.spreadsheet_url)
        
        # Fetch initial data
        df = connector.fetch_data(request.worksheet_name)
        
        # Store in warehouse
        data_warehouse.store_transactions(df, source="google_sheets")
        
        return {
            "success": True,
            "message": f"Connected to Google Sheets and loaded {len(df)} transactions",
            "spreadsheet_url": request.spreadsheet_url,
            "worksheet": request.worksheet_name,
            "row_count": len(df)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Connection failed: {str(e)}")

@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "model_trained": model_trained,
        "warehouse_available": data_warehouse.transactions_file.exists(),
        "components": {
            "ml_engine": "ready" if current_model else "not_initialized",
            "data_pipeline": "ready",
            "warehouse": "ready"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
