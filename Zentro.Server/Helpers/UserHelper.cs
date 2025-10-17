using System.Security.Claims;

namespace Zentro.Server.Helpers
{
    public static class UserHelper
    {
        /// <summary>
        /// Obtiene el ID del usuario desde los claims del token JWT.
        /// </summary>
        /// <param name=""></param>
        /// <returns>ID del usuario o 0 si no existe.</returns>
        public static int GetUserId(ClaimsPrincipal user)
        {
            var userIdClaim = user.FindFirst("UserId")?.Value
                              ?? user.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (int.TryParse(userIdClaim, out int userId))
                return userId;

            return 0;
        }
    }
}