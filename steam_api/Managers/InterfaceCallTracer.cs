using System;
using System.Diagnostics;
using System.Globalization;
using System.Linq;
using System.Linq.Expressions;
using System.Reflection;
using System.Threading;

namespace SKYNET.Managers
{
    /// <summary>
    /// Builds short-lived diagnostic wrappers around native Steamworks vtable
    /// delegates. The wrapper preserves the original signature/calling convention
    /// and records calls that otherwise pass through silent interface adapters.
    /// </summary>
    public static class InterfaceCallTracer
    {
        private const long TraceWindowMilliseconds = 10000;
        private static readonly Stopwatch TraceClock = new Stopwatch();
        private static long nextCallId;

        public static Delegate Wrap(
            Type delegateType,
            Delegate target,
            Type interfaceType,
            MethodInfo method,
            int slot)
        {
            if (!SteamEmulator.TraceInterfaces)
            {
                return target;
            }

            var invoke = delegateType.GetMethod("Invoke");
            var parameters = invoke.GetParameters()
                .Select(parameter => Expression.Parameter(parameter.ParameterType, parameter.Name))
                .ToArray();
            var targetExpression = Expression.Constant(target, delegateType);

            Expression DirectCall()
            {
                return Expression.Invoke(targetExpression, parameters);
            }

            var callId = Expression.Variable(typeof(long), "callId");
            var exception = Expression.Parameter(typeof(Exception), "exception");
            var begin = Expression.Assign(
                callId,
                Expression.Call(
                    typeof(InterfaceCallTracer),
                    nameof(Begin),
                    null,
                    Expression.Constant(interfaceType.Name),
                    Expression.Constant(slot),
                    Expression.Constant(method.Name)));

            Expression tracedCall;
            if (invoke.ReturnType == typeof(void))
            {
                var body = Expression.Block(
                    DirectCall(),
                    Expression.Call(
                        typeof(InterfaceCallTracer),
                        nameof(CompleteVoid),
                        null,
                        callId));
                tracedCall = Expression.Block(
                    new[] { callId },
                    begin,
                    Expression.TryCatch(
                        body,
                        Expression.Catch(
                            exception,
                            Expression.Block(
                                Expression.Call(
                                    typeof(InterfaceCallTracer),
                                    nameof(Fault),
                                    null,
                                    callId,
                                    exception),
                                Expression.Rethrow()))));
            }
            else
            {
                var result = Expression.Variable(invoke.ReturnType, "result");
                var body = Expression.Block(
                    new[] { result },
                    Expression.Assign(result, DirectCall()),
                    Expression.Call(
                        typeof(InterfaceCallTracer),
                        nameof(Complete),
                        null,
                        callId,
                        Expression.Convert(result, typeof(object))),
                    result);
                tracedCall = Expression.Block(
                    new[] { callId },
                    begin,
                    Expression.TryCatch(
                        body,
                        Expression.Catch(
                            exception,
                            Expression.Block(
                                Expression.Call(
                                    typeof(InterfaceCallTracer),
                                    nameof(Fault),
                                    null,
                                    callId,
                                    exception),
                                Expression.Rethrow(invoke.ReturnType)))));
            }

            Expression dispatch = invoke.ReturnType == typeof(void)
                ? Expression.IfThenElse(
                    Expression.Call(typeof(InterfaceCallTracer), nameof(IsActive), null),
                    tracedCall,
                    DirectCall())
                : Expression.Condition(
                    Expression.Call(typeof(InterfaceCallTracer), nameof(IsActive), null),
                    tracedCall,
                    DirectCall());

            return Expression.Lambda(delegateType, dispatch, parameters).Compile();
        }

        public static bool IsActive()
        {
            if (!SteamEmulator.TraceInterfaces)
            {
                return false;
            }

            if (!TraceClock.IsRunning)
            {
                TraceClock.Start();
            }

            return TraceClock.ElapsedMilliseconds <= TraceWindowMilliseconds;
        }

        public static void Diagnostic(string sender, string message)
        {
            if (!IsActive())
            {
                return;
            }

            SteamEmulator.Write(
                sender,
                $"+{TraceClock.Elapsed.TotalMilliseconds:F3}ms {message}");
        }

        public static long Begin(string interfaceName, int slot, string methodName)
        {
            long callId = Interlocked.Increment(ref nextCallId);
            SteamEmulator.Write(
                "InterfaceTrace",
                $"#{callId} +{TraceClock.Elapsed.TotalMilliseconds:F3}ms CALL {interfaceName}[{slot}] {methodName}");
            return callId;
        }

        public static void CompleteVoid(long callId)
        {
            SteamEmulator.Write(
                "InterfaceTrace",
                $"#{callId} +{TraceClock.Elapsed.TotalMilliseconds:F3}ms RETURN void");
        }

        public static void Complete(long callId, object result)
        {
            SteamEmulator.Write(
                "InterfaceTrace",
                $"#{callId} +{TraceClock.Elapsed.TotalMilliseconds:F3}ms RETURN {FormatResult(result)}");
        }

        public static void Fault(long callId, Exception exception)
        {
            SteamEmulator.Write(
                "InterfaceTrace",
                $"#{callId} +{TraceClock.Elapsed.TotalMilliseconds:F3}ms THROW " +
                $"{exception.GetType().Name}: {exception.Message}");
        }

        private static string FormatResult(object result)
        {
            if (result == null)
            {
                return "NULL";
            }

            if (result is IntPtr pointer)
            {
                return $"0x{pointer.ToInt64():X}";
            }

            if (result is UIntPtr unsignedPointer)
            {
                return $"0x{unsignedPointer.ToUInt64():X}";
            }

            if (result is bool boolean)
            {
                return boolean ? "true" : "false";
            }

            if (result is string text)
            {
                return $"\"{text}\"";
            }

            if (result is IFormattable formattable)
            {
                return formattable.ToString(null, CultureInfo.InvariantCulture);
            }

            return result.ToString();
        }
    }
}
