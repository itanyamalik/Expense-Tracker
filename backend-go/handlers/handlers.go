package handlers

import (
	"context"
	"fmt"
	"net/http"
	"time"

	database "expense-tracker/DB"
	"expense-tracker/models"
	"expense-tracker/utils"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"golang.org/x/crypto/bcrypt"
)

// Register creates a new user account
func Register(c *gin.Context) {
	fmt.Println("getting here")
	var userCollection = database.GetCollection("users")
	var user models.User
	if err := c.ShouldBindJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input: " + err.Error()})
		return
	}

	// Check if username already exists
	count, err := userCollection.CountDocuments(context.Background(), bson.M{"username": user.Username})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error checking username"})
		return
	}
	if count > 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "Username already exists"})
		return
	}

	// Hash the password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}
	user.Password = string(hashedPassword)
	user.ID = primitive.NewObjectID()

	// Insert new user into the database
	_, err = userCollection.InsertOne(context.Background(), user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "User created successfully"})
}

// Login authenticates a user and returns a JWT
func Login(c *gin.Context) {
	var userCollection = database.GetCollection("users")
	var loginDetails, user models.User
	if err := c.ShouldBindJSON(&loginDetails); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input: " + err.Error()})
		return
	}

	// Find the user by username
	err := userCollection.FindOne(context.Background(), bson.M{"username": loginDetails.Username}).Decode(&user)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid username or password"})
		return
	}

	// Compare the provided password with the stored hash
	err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(loginDetails.Password))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid username or password"})
		return
	}

	// Generate JWT token
	token, err := utils.GenerateToken(user.ID.Hex())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"token": token, "username": user.Username})
}


// AddExpense adds a new expense record for the authenticated user
func AddExpense(c *gin.Context) {
	expenseCollection := database.GetCollection("expenses")
	var expense models.Expense
	if err := c.ShouldBindJSON(&expense); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input: " + err.Error()})
		return
	}

	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	objID, err := primitive.ObjectIDFromHex(userID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID format"})
		return
	}

	expense.UserID = objID
	expense.ID = primitive.NewObjectID()

	_, err = expenseCollection.InsertOne(context.Background(), expense)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add expense"})
		return
	}

	c.JSON(http.StatusCreated, expense)
}

// GetExpenses retrieves all expenses for the authenticated user
func GetExpenses(c *gin.Context) {
	expenseCollection := database.GetCollection("expenses")
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	objID, err := primitive.ObjectIDFromHex(userID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID format"})
		return
	}

	var expenses []models.Expense
	opts := options.Find().SetSort(bson.D{{Key: "date", Value: -1}}) // Sort by date descending
	cursor, err := expenseCollection.Find(context.Background(), bson.M{"userId": objID}, opts)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve expenses"})
		return
	}
	defer cursor.Close(context.Background())

	if err = cursor.All(context.Background(), &expenses); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error decoding expenses"})
		return
	}

	if expenses == nil {
		expenses = []models.Expense{}
	}

	c.JSON(http.StatusOK, expenses)
}

// GetExpenseByID retrieves a single expense by its ID
func GetExpenseByID(c *gin.Context) {
	expenseCollection := database.GetCollection("expenses")
	expenseID := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(expenseID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid expense ID"})
		return
	}

	userID, _ := c.Get("userID")
	userObjID, _ := primitive.ObjectIDFromHex(userID.(string))

	var expense models.Expense
	filter := bson.M{"_id": objID, "userId": userObjID}
	err = expenseCollection.FindOne(context.Background(), filter).Decode(&expense)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Expense not found"})
		return
	}

	c.JSON(http.StatusOK, expense)
}

// UpdateExpense updates an existing expense record
func UpdateExpense(c *gin.Context) {
	expenseCollection := database.GetCollection("expenses")
	expenseID := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(expenseID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid expense ID"})
		return
	}

	var updatedExpense models.Expense
	if err := c.ShouldBindJSON(&updatedExpense); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input: " + err.Error()})
		return
	}

	userID, _ := c.Get("userID")
	userObjID, _ := primitive.ObjectIDFromHex(userID.(string))

	filter := bson.M{"_id": objID, "userId": userObjID}
	update := bson.M{
		"$set": bson.M{
			"amount":      updatedExpense.Amount,
			"category":    updatedExpense.Category,
			"description": updatedExpense.Description,
			"date":        updatedExpense.Date,
		},
	}

	result, err := expenseCollection.UpdateOne(context.Background(), filter, update)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update expense"})
		return
	}

	if result.MatchedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Expense not found or user not authorized"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Expense updated successfully"})
}

// DeleteExpense removes an expense record
func DeleteExpense(c *gin.Context) {
	expenseCollection := database.GetCollection("expenses")
	expenseID := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(expenseID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid expense ID"})
		return
	}

	userID, _ := c.Get("userID")
	userObjID, _ := primitive.ObjectIDFromHex(userID.(string))

	filter := bson.M{"_id": objID, "userId": userObjID}
	result, err := expenseCollection.DeleteOne(context.Background(), filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete expense"})
		return
	}

	if result.DeletedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Expense not found or user not authorized"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Expense deleted successfully"})
}

// GetProfile retrieves user data and aggregated expense stats
func GetProfile(c *gin.Context) {
	var userCollection = database.GetCollection("users")
	userID, _ := c.Get("userID")
	userObjID, _ := primitive.ObjectIDFromHex(userID.(string))

	// Get user details (including monthly limit)
	var user models.User
	err := userCollection.FindOne(context.Background(), bson.M{"_id": userObjID}).Decode(&user)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	now := time.Now()
	// Last 7 days
	sevenDaysAgo := now.AddDate(0, 0, -7)
	// Current month
	startOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())

	// Aggregation pipelines
	last7DaysTotal, _ := getExpenseTotalForPeriod(userObjID, sevenDaysAgo, now)
	currentMonthTotal, _ := getExpenseTotalForPeriod(userObjID, startOfMonth, now)

	limitExceeded := false
	if user.MonthlyLimit > 0 && currentMonthTotal > user.MonthlyLimit {
		limitExceeded = true
	}

	c.JSON(http.StatusOK, gin.H{
		"username":             user.Username,
		"monthlyLimit":         user.MonthlyLimit,
		"expensesLast7Days":    last7DaysTotal,
		"expensesCurrentMonth": currentMonthTotal,
		"monthlyLimitExceeded": limitExceeded,
	})
}

// UpdateExpenseLimit sets or updates the user's monthly expense limit
func UpdateExpenseLimit(c *gin.Context) {
	var userCollection = database.GetCollection("users")
	userID, _ := c.Get("userID")
	userObjID, _ := primitive.ObjectIDFromHex(userID.(string))

	var payload struct {
		Limit float64 `json:"limit"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input, 'limit' field is required."})
		return
	}

	filter := bson.M{"_id": userObjID}
	update := bson.M{"$set": bson.M{"monthlyLimit": payload.Limit}}
	_, err := userCollection.UpdateOne(context.Background(), filter, update)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update monthly limit"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Monthly limit updated successfully"})
}

// Helper function to aggregate expense totals for a given period
func getExpenseTotalForPeriod(userID primitive.ObjectID, startDate, endDate time.Time) (float64, error) {
	expenseCollection := database.GetCollection("expenses")
	matchStage := bson.D{{Key: "$match", Value: bson.D{
		{Key: "userId", Value: userID},
		{Key: "date", Value: bson.D{{Key: "$gte", Value: startDate}, {Key: "$lt", Value: endDate}}},
	}}}
	groupStage := bson.D{{Key: "$group", Value: bson.D{
		{Key: "_id", Value: nil},
		{Key: "total", Value: bson.D{{Key: "$sum", Value: "$amount"}}},
	}}}

	cursor, err := expenseCollection.Aggregate(context.Background(), mongo.Pipeline{matchStage, groupStage})
	if err != nil {
		return 0, err
	}
	defer cursor.Close(context.Background())

	var results []bson.M
	if err = cursor.All(context.Background(), &results); err != nil {
		return 0, err
	}

	if len(results) > 0 {
		total := results[0]["total"].(float64)
		return total, nil
	}

	return 0, nil
}
