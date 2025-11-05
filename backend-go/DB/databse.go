package database

import (
	"context"
	"log"
	"os"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var client *mongo.Client

// InitDB initializes and returns a MongoDB client
func InitDB() *mongo.Client {
	mongoURI := os.Getenv("MONGODB_URI")
	if mongoURI == "" {
		log.Fatal("You must set your 'MONGODB_URI' environmental variable. See\n\t https://www.mongodb.com/docs/drivers/go/current/usage-examples/#environment-variable")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var err error
	client, err = mongo.Connect(ctx, options.Client().ApplyURI(mongoURI))
	if err != nil {
		log.Fatal("Error connecting to MongoDB:", err)
	}

	// Ping the primary
	if err := client.Ping(ctx, nil); err != nil {
		log.Fatal("Could not ping MongoDB:", err)
	}

	log.Println("Successfully connected to MongoDB!")
	return client
}

// GetCollection returns a handle to a MongoDB collection
func GetCollection(collectionName string) *mongo.Collection {
	if client == nil {
		log.Fatal("MongoDB client not initialized. Call InitDB first.")
	}
	// You can specify your database name here
	databaseName := "expense_tracker_db"
	return client.Database(databaseName).Collection(collectionName)
}
