package middleware

import (
	"net/http"
	"strings"

	"expense-tracker/utils"
	"github.com/gin-gonic/gin"
)

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Let CORS middleware answer preflights before any auth
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent) // 204 preflight OK
			return
		}

		authHeader := c.GetHeader("Authorization")
		// Accept "Bearer" in any case just in case
		if !strings.HasPrefix(strings.ToLower(authHeader), "bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "Authorization header format must be Bearer {token}",
			})
			return
		}

		tokenString := strings.TrimSpace(authHeader[len("Bearer "):])
		userID, err := utils.ValidateToken(tokenString)
		if err != nil || userID == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			return
		}

		c.Set("userID", userID)
		c.Next()
	}
}
