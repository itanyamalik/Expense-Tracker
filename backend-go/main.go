package main

import (
	"context"
	"log"
	"net/http"
	"os"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/mongo"

	database "expense-tracker/DB"
	"expense-tracker/handlers"
	"expense-tracker/middleware"
	// "expense-tracker/middleware"
)

var mongoClient *mongo.Client

func main() {
	// Load environment variables from .env file
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// Initialize MongoDB connection
	mongoClient = database.InitDB()
	defer func() {
		if err := mongoClient.Disconnect(context.Background()); err != nil {
			log.Fatal("Error disconnecting from MongoDB:", err)
		}
	}()

	// Set up Gin router
	router := gin.Default()

	config := cors.DefaultConfig() // cors for additional security
	// // Replace "http://localhost:5173" with your frontend's actual origin
	config.AllowOrigins = []string{"*"}
	config.AllowCredentials = false
	config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Type", "Authorization"}
	router.Use(cors.New(config))

	// A simple health check endpoint
	router.GET("/ping", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"message": "pong",
		})
	})

	api := router.Group("/api")
	{
		// Public routes (authentication)
		authRoutes := api.Group("/users")
		{
			authRoutes.POST("/register", handlers.Register)
			authRoutes.POST("/login", handlers.Login)
		}

		// Protected routes
		protected := api.Group("/")
		protected.Use(middleware.AuthMiddleware())
		{
			// Expense routes
			expenseRoutes := protected.Group("/expenses")
			{
				expenseRoutes.POST("", handlers.AddExpense)
				expenseRoutes.GET("", handlers.GetExpenses)
				expenseRoutes.GET("/:id", handlers.GetExpenseByID)
				expenseRoutes.PUT("/:id", handlers.UpdateExpense)
				expenseRoutes.DELETE("/:id", handlers.DeleteExpense)
			}

			// Profile routes
			profileRoutes := protected.Group("/profile")
			{
				profileRoutes.GET("", handlers.GetProfile)
				profileRoutes.PUT("/limit", handlers.UpdateExpenseLimit)
			}
		}
	}

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}
	srv := &http.Server{Handler: router}

	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal("IPv6 server error:", err)
		}
	}()

	// IPv6 loopback
	go func() {
		if err := http.ListenAndServe("[::1]:"+port, router); err != nil && err != http.ErrServerClosed {
			log.Fatal("IPv6 server error:", err)
		}
	}()

	// IPv4 loopback
	if err := http.ListenAndServe("127.0.0.1:"+port, router); err != nil && err != http.ErrServerClosed {
		log.Fatal("IPv4 server error:", err)
	}
}
