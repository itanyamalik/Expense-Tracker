package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// User represents the user model in the database
type User struct {
	ID           primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Username     string             `bson:"username" json:"username" binding:"required"`
	Password     string             `bson:"password" json:"password" binding:"required"`
	MonthlyLimit float64            `bson:"monthlyLimit,omitempty" json:"monthlyLimit,omitempty"`
}

// Expense represents the expense model in the database
type Expense struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID      primitive.ObjectID `bson:"userId" json:"userId"`
	Amount      float64            `bson:"amount" json:"amount" binding:"required"`
	Category    string             `bson:"category" json:"category" binding:"required"`
	Description string             `bson:"description" json:"description"`
	Date        time.Time          `bson:"date" json:"date" binding:"required"`
	ReceiptURL  string             `bson:"receiptURL,omitempty" json:"receiptURL,omitempty"`
}
